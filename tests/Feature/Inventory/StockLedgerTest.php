<?php

namespace Tests\Feature\Inventory;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StockLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(Tenant $tenant): User
    {
        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    protected function location(Tenant $tenant): StockLocation
    {
        $branch = Branch::factory()->create(['tenant_id' => $tenant->id]);

        return StockLocation::factory()->create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'is_default' => true,
        ]);
    }

    public function test_registration_provisions_default_units(): void
    {
        $this->post('/register', [
            'identifier_type' => 'email',
            'name' => 'Owner',
            'restaurant_name' => 'Spice House',
            'email' => 'owner@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $tenant = Tenant::where('business_email', 'owner@example.com')->firstOrFail();

        $this->assertSame(5, $tenant->units()->count());
        $this->assertDatabaseHas('unit_conversions', ['tenant_id' => $tenant->id, 'factor' => 1000.000000]);
    }

    public function test_opening_stock_records_a_movement_and_creates_a_balance(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $location = $this->location($tenant);
        $ingredient = Ingredient::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)->post('/inventory/opening', [
            'branch_id' => $location->branch_id,
            'stock_location_id' => $location->id,
            'item_type' => 'ingredient',
            'item_id' => $ingredient->id,
            'quantity' => 25,
            'unit_cost' => 4.5,
        ])->assertRedirect();

        $this->assertDatabaseHas('stock_movements', [
            'stockable_type' => 'ingredient',
            'stockable_id' => $ingredient->id,
            'quantity_delta' => 25,
            'reason' => StockMovementReason::Opening->value,
        ]);

        $this->assertSame(25.0, app(StockService::class)->balanceFor($ingredient, $location));
    }

    public function test_adjustment_sets_counted_quantity_and_records_the_delta(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $location = $this->location($tenant);
        $ingredient = Ingredient::factory()->create(['tenant_id' => $tenant->id]);

        $service = app(StockService::class);
        $service->receiveOpening($ingredient, $location, 30);

        $this->actingAs($owner)->post('/inventory/adjust', [
            'branch_id' => $location->branch_id,
            'stock_location_id' => $location->id,
            'item_type' => 'ingredient',
            'item_id' => $ingredient->id,
            'quantity' => 26,
            'note' => 'Monthly count',
        ])->assertRedirect();

        $this->assertSame(26.0, $service->balanceFor($ingredient, $location));
        $this->assertDatabaseHas('stock_movements', [
            'stockable_id' => $ingredient->id,
            'quantity_delta' => -4,
            'reason' => StockMovementReason::Adjustment->value,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'stock.adjusted']);
    }

    public function test_negative_stock_is_prevented_by_default(): void
    {
        $tenant = Tenant::factory()->create();
        $location = $this->location($tenant);
        $product = Product::factory()->create(['tenant_id' => $tenant->id]);

        app(TenantContext::class)->set($tenant);

        $this->expectException(ValidationException::class);

        app(StockService::class)->record($product, $location, -5, StockMovementReason::Adjustment);
    }

    public function test_negative_stock_can_be_allowed_by_tenant_setting(): void
    {
        $tenant = Tenant::factory()->create();
        $tenant->mergeSettings(['inventory' => ['allow_negative' => true]]);
        $tenant->save();

        $location = $this->location($tenant);
        $product = Product::factory()->create(['tenant_id' => $tenant->id]);

        app(TenantContext::class)->set($tenant);

        $movement = app(StockService::class)->record($product, $location, -5, StockMovementReason::Adjustment);

        $this->assertSame(-5.0, (float) $movement->quantity_delta);
        $this->assertSame(-5.0, app(StockService::class)->balanceFor($product, $location));
    }

    public function test_movement_ledger_is_append_only(): void
    {
        $tenant = Tenant::factory()->create();
        $location = $this->location($tenant);
        $ingredient = Ingredient::factory()->create(['tenant_id' => $tenant->id]);

        $service = app(StockService::class);
        $service->receiveOpening($ingredient, $location, 10);
        $service->receiveOpening($ingredient, $location, 5);

        $this->assertSame(2, StockMovement::count());
        $this->assertSame(15.0, $service->balanceFor($ingredient, $location));

        // A single cached balance row aggregates both movements.
        $this->assertSame(1, StockBalance::count());
    }

    public function test_cannot_record_stock_against_another_tenants_item(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $ownerA = $this->owner($tenantA);
        $location = $this->location($tenantA);
        $productB = Product::factory()->create(['tenant_id' => $tenantB->id]);

        $this->actingAs($ownerA)->post('/inventory/opening', [
            'branch_id' => $location->branch_id,
            'stock_location_id' => $location->id,
            'item_type' => 'product',
            'item_id' => $productB->id,
            'quantity' => 10,
        ])->assertNotFound();
    }

    public function test_location_must_belong_to_the_selected_branch(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $location = $this->location($tenant);
        $otherBranch = Branch::factory()->create(['tenant_id' => $tenant->id]);
        $ingredient = Ingredient::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)->post('/inventory/opening', [
            'branch_id' => $otherBranch->id,
            'stock_location_id' => $location->id,
            'item_type' => 'ingredient',
            'item_id' => $ingredient->id,
            'quantity' => 10,
        ])->assertSessionHasErrors('stock_location_id');
    }
}
