<?php

namespace Tests\Feature\Inventory;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockTransfer;
use App\Domain\Inventory\StockService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $from;

    protected Branch $to;

    protected User $owner;

    protected Ingredient $ingredient;

    protected StockLocation $fromLocation;

    protected StockLocation $toLocation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->from = Branch::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->to = Branch::factory()->create(['tenant_id' => $this->tenant->id]);

        $defaults = app(ProvisionInventoryDefaults::class);
        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        $this->fromLocation = $defaults->defaultLocationFor($this->from);
        $this->toLocation = $defaults->defaultLocationFor($this->to);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);

        $this->ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id, 'cost_per_unit' => 3]);
        app(StockService::class)->receiveOpening($this->ingredient, $this->fromLocation, 50);
    }

    protected function createTransfer(float $quantity = 20): StockTransfer
    {
        $this->actingAs($this->owner)->post('/transfers', [
            'from_branch_id' => $this->from->id,
            'to_branch_id' => $this->to->id,
            'items' => [[
                'item_type' => 'ingredient',
                'item_id' => $this->ingredient->id,
                'quantity' => $quantity,
            ]],
        ])->assertRedirect();

        return StockTransfer::latest('id')->firstOrFail();
    }

    public function test_a_transfer_can_be_created_and_approved(): void
    {
        $transfer = $this->createTransfer();

        $this->assertStringStartsWith('TRF-', $transfer->number);
        $this->assertSame('draft', $transfer->status->value);

        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/approve")->assertRedirect();
        $this->assertSame('approved', $transfer->fresh()->status->value);
    }

    public function test_source_and_destination_must_differ(): void
    {
        $this->actingAs($this->owner)->post('/transfers', [
            'from_branch_id' => $this->from->id,
            'to_branch_id' => $this->from->id,
            'items' => [['item_type' => 'ingredient', 'item_id' => $this->ingredient->id, 'quantity' => 5]],
        ])->assertSessionHasErrors('to_branch_id');
    }

    public function test_dispatch_moves_stock_out_and_receive_moves_it_in(): void
    {
        $transfer = $this->createTransfer(20);
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/approve");
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/dispatch")->assertRedirect();

        $stock = app(StockService::class);
        $this->assertSame(30.0, $stock->balanceFor($this->ingredient, $this->fromLocation));
        $this->assertSame(0.0, $stock->balanceFor($this->ingredient, $this->toLocation));
        $this->assertSame('dispatched', $transfer->fresh()->status->value);

        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/receive")->assertRedirect();

        $this->assertSame(30.0, $stock->balanceFor($this->ingredient, $this->fromLocation));
        $this->assertSame(20.0, $stock->balanceFor($this->ingredient, $this->toLocation));
        $this->assertSame('received', $transfer->fresh()->status->value);

        $this->assertDatabaseHas('stock_movements', ['reason' => 'transfer_out']);
        $this->assertDatabaseHas('stock_movements', ['reason' => 'transfer_in']);
    }

    public function test_cannot_receive_before_dispatch(): void
    {
        $transfer = $this->createTransfer();

        $this->actingAs($this->owner)
            ->post("/transfers/{$transfer->id}/receive")
            ->assertSessionHasErrors('status');
    }

    public function test_a_dispatched_transfer_cannot_be_cancelled(): void
    {
        $transfer = $this->createTransfer();
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/approve");
        $this->actingAs($this->owner)->post("/transfers/{$transfer->id}/dispatch");

        $this->actingAs($this->owner)
            ->post("/transfers/{$transfer->id}/cancel")
            ->assertSessionHasErrors('status');
    }
}
