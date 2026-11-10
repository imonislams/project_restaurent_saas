<?php

namespace Tests\Feature\Inventory;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\Models\Unit;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockBalancePaginationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected StockLocation $location;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        $this->location = StockLocation::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'is_default' => true,
        ]);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    private function ingredient(string $name, float $costPerUnit = 0): Ingredient
    {
        return Ingredient::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => $name,
            'cost_per_unit' => $costPerUnit,
        ]);
    }

    private function balance(Ingredient $ingredient, float $quantity, ?StockLocation $location = null): StockBalance
    {
        $location ??= $this->location;

        return StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $location->branch_id,
            'stock_location_id' => $location->id,
            'stockable_type' => $ingredient->getMorphClass(),
            'stockable_id' => $ingredient->id,
            'quantity' => $quantity,
        ]);
    }

    public function test_stock_on_hand_is_paginated_with_twenty_records_per_page(): void
    {
        foreach (range(1, 45) as $index) {
            $this->balance($this->ingredient('Item '.$index), $index);
        }

        $this->actingAs($this->owner)
            ->get('/inventory')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Inventory/Index')
                ->has('balances.data', 20)
                ->where('balances.total', 45)
                ->where('balances.current_page', 1)
                ->where('balances.last_page', 3)
                ->where('inventoryFilters.per_page', 20));

        $this->actingAs($this->owner)
            ->get('/inventory?balances_page=2')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 20)
                ->where('balances.current_page', 2));

        $this->actingAs($this->owner)
            ->get('/inventory?balances_page=3')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 5)
                ->where('balances.current_page', 3));
    }

    public function test_per_page_is_whitelisted_and_preserved_in_the_paginator(): void
    {
        foreach (range(1, 45) as $index) {
            $this->balance($this->ingredient('Item '.$index), $index);
        }

        $this->actingAs($this->owner)
            ->get('/inventory?per_page=50')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 45)
                ->where('inventoryFilters.per_page', 50));

        $this->actingAs($this->owner)
            ->get('/inventory?per_page=999')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 20)
                ->where('inventoryFilters.per_page', 20));
    }

    public function test_search_branch_location_and_depleted_filters_apply_server_side(): void
    {
        $rice = $this->ingredient('Rice', 2);
        $this->balance($rice, 5);
        $this->balance($this->ingredient('Milk'), -1);

        $secondBranch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'SECOND']);
        $secondLocation = StockLocation::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $secondBranch->id,
        ]);
        $this->balance($this->ingredient('Flour'), 8, $secondLocation);

        $this->actingAs($this->owner)
            ->get('/inventory?search=Rice')
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 1)
                ->where('balances.total', 1));

        $this->actingAs($this->owner)
            ->get('/inventory?branch_id='.$secondBranch->id)
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 1)
                ->where('balances.data.0.item_name', 'Flour'));

        $this->actingAs($this->owner)
            ->get('/inventory?location_id='.$this->location->id)
            ->assertInertia(fn (Assert $page) => $page->where('balances.total', 2));

        $this->actingAs($this->owner)
            ->get('/inventory?depleted=1')
            ->assertInertia(fn (Assert $page) => $page
                ->has('balances.data', 1)
                ->where('balanceStats.depleted', 1));

        $this->actingAs($this->owner)
            ->get('/inventory')
            ->assertInertia(fn (Assert $page) => $page
                ->where('balanceStats.depleted', 1)
                ->where('balanceStats.valuation', 10.0));
    }

    public function test_branch_limited_user_only_sees_their_own_stock(): void
    {
        $this->balance($this->ingredient('Rice'), 5);

        $secondBranch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'SECOND']);
        $secondLocation = StockLocation::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $secondBranch->id,
        ]);
        $this->balance($this->ingredient('Flour'), 8, $secondLocation);

        $manager = User::factory()->forTenant($this->tenant)->create();
        $manager->assignRole(RoleName::BranchManager);
        $manager->syncBranchAccess([$this->branch->id]);

        $this->actingAs($manager)
            ->get('/inventory')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('balances.total', 1)
                ->where('balances.data.0.item_name', 'Rice'));

        $this->actingAs($manager)
            ->get('/inventory?branch_id='.$secondBranch->id)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('balances.total', 0)
                ->has('balances.data', 0));
    }

    public function test_print_route_returns_every_filtered_row_without_pagination(): void
    {
        foreach (range(1, 30) as $index) {
            $this->balance($this->ingredient('Rice '.$index), $index);
        }

        $this->balance($this->ingredient('Milk'), 3);

        $this->actingAs($this->owner)
            ->get('/inventory/print?tab=balances&search=Rice')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Inventory/Print')
                ->where('tab', 'balances')
                ->has('rows', 30)
                ->where('total', 30)
                ->where('filterSummary', 'Search: Rice'));
    }

    public function test_ledger_ingredients_and_units_are_paginated_and_filterable(): void
    {
        foreach (range(1, 25) as $index) {
            $ingredient = $this->ingredient('Ledger Item '.$index);

            StockMovement::create([
                'tenant_id' => $this->tenant->id,
                'branch_id' => $this->branch->id,
                'stock_location_id' => $this->location->id,
                'stockable_type' => $ingredient->getMorphClass(),
                'stockable_id' => $ingredient->id,
                'quantity_delta' => $index,
                'reason' => 'opening',
                'note' => 'opening batch',
            ]);
        }

        Unit::factory()
            ->count(25)
            ->sequence(fn ($sequence) => [
                'name' => 'Unit '.$sequence->index,
                'code' => 'unit-'.$sequence->index,
            ])
            ->create(['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->owner)
            ->get('/inventory?tab=movements&per_page=10&movements_page=2')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('tab', 'movements')
                ->has('movements.data', 10)
                ->where('movements.total', 25)
                ->where('movements.current_page', 2)
                ->where('movements.links.1.url', fn ($url) => str_contains($url, 'tab=movements')));

        $this->actingAs($this->owner)
            ->get('/inventory?per_page=10&movements_page=1&movement_reason=opening')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('movements.total', 25)
                ->where('inventoryFilters.movement_reason', 'opening'));

        $this->actingAs($this->owner)
            ->get('/inventory?per_page=10&ingredients_page=1&ingredient_search=Ledger')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('ingredients.data', 10)
                ->where('ingredients.total', 25));

        $this->actingAs($this->owner)
            ->get('/inventory?per_page=10&units_page=1')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('units.data', 10)
                ->where('units.total', 25));
    }

    public function test_balance_lookup_returns_current_quantity_and_is_tenant_scoped(): void
    {
        $rice = $this->ingredient('Rice');
        $this->balance($rice, 7.5);

        $this->actingAs($this->owner)
            ->get('/inventory/balance?branch_id='.$this->branch->id
                .'&stock_location_id='.$this->location->id
                .'&item_type=ingredient&item_id='.$rice->id)
            ->assertOk()
            ->assertJson(['quantity' => 7.5]);

        $foreignTenant = Tenant::factory()->create();
        $foreignBranch = Branch::factory()->create(['tenant_id' => $foreignTenant->id]);
        $foreignLocation = StockLocation::factory()->create([
            'tenant_id' => $foreignTenant->id,
            'branch_id' => $foreignBranch->id,
        ]);

        $this->actingAs($this->owner)
            ->get('/inventory/balance?branch_id='.$foreignBranch->id
                .'&stock_location_id='.$foreignLocation->id
                .'&item_type=ingredient&item_id='.$rice->id)
            ->assertNotFound();
    }

    public function test_inventory_view_permission_is_required(): void
    {
        $userWithoutPermissions = User::factory()->forTenant($this->tenant)->create();

        $this->actingAs($userWithoutPermissions)->get('/inventory')->assertForbidden();
        $this->actingAs($userWithoutPermissions)->get('/inventory/print')->assertForbidden();
    }
}
