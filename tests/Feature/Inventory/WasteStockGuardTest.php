<?php

namespace Tests\Feature\Inventory;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\StockService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Domain\Waste\Models\WasteRecord;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Waste must not be able to drive stock below zero unless the tenant has
 * explicitly opted into negative stock.
 */
class WasteStockGuardTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected Ingredient $ingredient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id]);
        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);

        $this->ingredient = Ingredient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Milk',
            'cost_per_unit' => 5,
        ]);

        app(StockService::class)->receiveOpening($this->ingredient, $this->location(), 20);
    }

    protected function location()
    {
        return app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
    }

    protected function balance(): float
    {
        return app(StockService::class)->balanceFor($this->ingredient, $this->location());
    }

    protected function record(float $quantity)
    {
        return $this->actingAs($this->owner)->post('/waste', [
            'branch_id' => $this->branch->id,
            'item_type' => 'ingredient',
            'item_id' => $this->ingredient->id,
            'quantity' => $quantity,
            'reason' => 'spoilage',
        ]);
    }

    public function test_waste_cannot_drive_stock_negative_by_default(): void
    {
        $this->record(100)->assertSessionHasErrors('quantity');

        $this->assertSame(20.0, $this->balance());
        $this->assertSame(0, WasteRecord::count());
        $this->assertSame(0, StockMovement::where('reason', 'waste')->count());
    }

    public function test_negative_stock_is_allowed_only_when_the_tenant_opts_in(): void
    {
        $this->tenant->mergeSettings(['inventory' => ['allow_negative' => true]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->record(100)->assertRedirect();

        $this->assertSame(-80.0, $this->balance());
        $this->assertSame('approved', WasteRecord::firstOrFail()->status);
    }

    public function test_waste_within_available_stock_still_deducts(): void
    {
        $this->record(5)->assertRedirect();

        $this->assertSame(15.0, $this->balance());
        $this->assertDatabaseHas('stock_movements', ['reason' => 'waste', 'quantity_delta' => -5]);
    }
}
