<?php

namespace Tests\Feature\Waste;

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

class WasteTest extends TestCase
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

        app(StockService::class)->receiveOpening(
            $this->ingredient,
            app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch),
            20,
        );
    }

    protected function record(float $quantity, string $reason = 'spoilage')
    {
        return $this->actingAs($this->owner)->post('/waste', [
            'branch_id' => $this->branch->id,
            'item_type' => 'ingredient',
            'item_id' => $this->ingredient->id,
            'quantity' => $quantity,
            'reason' => $reason,
        ]);
    }

    protected function balance(): float
    {
        return app(StockService::class)->balanceFor(
            $this->ingredient,
            app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch),
        );
    }

    public function test_small_waste_is_auto_approved_and_deducts_stock(): void
    {
        $this->record(3)->assertRedirect();

        $record = WasteRecord::firstOrFail();
        $this->assertSame('approved', $record->status);
        $this->assertSame('15.00', $record->cost);
        $this->assertSame(17.0, $this->balance());
        $this->assertDatabaseHas('stock_movements', ['reason' => 'waste', 'stockable_id' => $this->ingredient->id]);
    }

    public function test_waste_above_threshold_is_pending_and_does_not_move_stock(): void
    {
        $this->tenant->mergeSettings(['waste' => ['approval_threshold' => 10]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->record(5)->assertRedirect();

        $record = WasteRecord::firstOrFail();
        $this->assertSame('pending', $record->status);
        $this->assertSame(20.0, $this->balance());
        $this->assertSame(0, StockMovement::where('reason', 'waste')->count());
    }

    public function test_approving_pending_waste_deducts_stock(): void
    {
        $this->tenant->mergeSettings(['waste' => ['approval_threshold' => 10]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);
        $this->record(5);

        $record = WasteRecord::firstOrFail();

        $this->actingAs($this->owner)->post("/waste/{$record->id}/approve")->assertRedirect();

        $this->assertSame('approved', $record->fresh()->status);
        $this->assertSame(15.0, $this->balance());
        $this->assertDatabaseHas('audit_logs', ['action' => 'waste.approved']);
    }

    public function test_rejecting_waste_leaves_stock_untouched(): void
    {
        $this->tenant->mergeSettings(['waste' => ['approval_threshold' => 10]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);
        $this->record(5);

        $record = WasteRecord::firstOrFail();

        $this->actingAs($this->owner)->post("/waste/{$record->id}/reject")->assertRedirect();

        $this->assertSame('rejected', $record->fresh()->status);
        $this->assertSame(20.0, $this->balance());
    }
}
