<?php

namespace Tests\Feature\Branches;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchAccessEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branchA;

    protected Branch $branchB;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        // The dine-in table requirement has its own test; these tests cover other behaviour.
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false], 'pos.require_table_for_dine_in' => false]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branchA = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        $this->branchB = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'BR-B']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branchA);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branchB);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branchA, $this->owner, 100);
        app(ShiftService::class)->open($this->branchB, $this->owner, 100);
    }

    protected function userWith(RoleName $role, array $branchIds): User
    {
        $user = User::factory()->forTenant($this->tenant)->create();
        $user->assignRole($role);
        $user->syncBranchAccess($branchIds);

        return $user;
    }

    protected function sellIn(Branch $branch): Order
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => $product->price_dine_in, 'tendered' => $product->price_dine_in]],
        ])->assertRedirect();

        return Order::latest('id')->firstOrFail();
    }

    public function test_kitchen_tickets_are_scoped_to_accessible_branches(): void
    {
        $orderA = $this->sellIn($this->branchA);
        $orderB = $this->sellIn($this->branchB);

        $cook = $this->userWith(RoleName::KitchenStaff, [$this->branchA->id]);

        // The data-layer scope hides the other branch's ticket entirely.
        $this->actingAs($cook);
        $this->assertSame(1, KitchenTicket::count());
        $this->assertSame($orderA->id, KitchenTicket::firstOrFail()->order_id);

        // The board shows only the accessible branch's ticket.
        $this->actingAs($cook)->get('/kitchen')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('tickets', 1)
                ->where('tickets.0.order_number', $orderA->order_number));

        // The owner is unrestricted: active branch A, then B after switching.
        $this->actingAs($this->owner)->get('/kitchen')
            ->assertInertia(fn ($page) => $page->where('tickets.0.order_number', $orderA->order_number));

        $this->actingAs($this->owner)
            ->post(route('branch.switch'), ['branch_id' => $this->branchB->id])
            ->assertRedirect();

        $this->actingAs($this->owner)->get('/kitchen')
            ->assertInertia(fn ($page) => $page->where('tickets.0.order_number', $orderB->order_number));
    }

    public function test_a_branch_user_cannot_act_on_another_branchs_ticket(): void
    {
        $this->sellIn($this->branchA);
        $this->sellIn($this->branchB);

        $ticketA = KitchenTicket::where('branch_id', $this->branchA->id)->firstOrFail();
        $ticketB = KitchenTicket::where('branch_id', $this->branchB->id)->firstOrFail();

        $cook = $this->userWith(RoleName::KitchenStaff, [$this->branchA->id]);

        // Direct URL to another branch's ticket fails closed.
        $this->actingAs($cook)
            ->patch("/kitchen/tickets/{$ticketB->id}", ['status' => 'preparing'])
            ->assertNotFound();

        // Their own branch's ticket works.
        $this->actingAs($cook)
            ->patch("/kitchen/tickets/{$ticketA->id}", ['status' => 'preparing'])
            ->assertRedirect();

        $this->assertDatabaseHas('kitchen_tickets', ['id' => $ticketA->id, 'status' => 'preparing']);
    }

    public function test_orders_are_scoped_and_direct_urls_are_blocked(): void
    {
        $orderA = $this->sellIn($this->branchA);
        $orderB = $this->sellIn($this->branchB);

        $cashier = $this->userWith(RoleName::Cashier, [$this->branchA->id]);

        $this->actingAs($cashier)->get('/orders')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('orders.data', 1));

        $this->actingAs($cashier)->get("/orders/{$orderB->id}")->assertNotFound();
        $this->actingAs($cashier)->get("/orders/{$orderA->id}")->assertOk();

        // An inaccessible branch id is ignored (falls back to the active branch).
        $this->actingAs($cashier)->get('/orders?branch_id='.$this->branchB->id)
            ->assertInertia(fn ($page) => $page->where('filters.branch_id', $this->branchA->id));
    }

    public function test_tables_cannot_be_managed_across_branches(): void
    {
        $tableA = Table::create(['tenant_id' => $this->tenant->id, 'branch_id' => $this->branchA->id, 'name' => 'A1', 'seats' => 2]);
        $tableB = Table::create(['tenant_id' => $this->tenant->id, 'branch_id' => $this->branchB->id, 'name' => 'B1', 'seats' => 2]);

        $manager = $this->userWith(RoleName::BranchManager, [$this->branchA->id]);

        $this->actingAs($manager)
            ->patch("/tables/{$tableB->id}/status", ['status' => 'cleaning'])
            ->assertNotFound();

        $this->actingAs($manager)
            ->patch("/tables/{$tableA->id}/status", ['status' => 'cleaning'])
            ->assertRedirect();
    }

    public function test_write_paths_reject_inaccessible_branch_ids(): void
    {
        $cashier = $this->userWith(RoleName::Cashier, [$this->branchA->id]);
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        // Opening a shift in another branch is rejected.
        $this->actingAs($cashier)
            ->post('/shifts/open', ['branch_id' => $this->branchB->id, 'opening_float' => 100])
            ->assertSessionHasErrors('branch_id');

        // Ringing a sale in another branch is rejected.
        $this->actingAs($cashier)
            ->post('/pos/orders', [
                'branch_id' => $this->branchB->id,
                'order_type' => 'dine_in',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
                'payments' => [['payment_method_id' => $cash->id, 'amount' => $product->price_dine_in, 'tendered' => $product->price_dine_in]],
            ])
            ->assertSessionHasErrors('branch_id');
    }

    public function test_a_user_with_two_branches_reaches_both(): void
    {
        $orderA = $this->sellIn($this->branchA);
        $orderB = $this->sellIn($this->branchB);

        $supervisor = $this->userWith(RoleName::Supervisor, [$this->branchA->id, $this->branchB->id]);

        // Active branch defaults to A: only A's order is visible.
        $this->actingAs($supervisor)->get('/orders')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('orders.data.0.order_number', $orderA->order_number));

        // Switching to B surfaces B's order — explicitly authorised multi-branch.
        $this->actingAs($supervisor)
            ->post(route('branch.switch'), ['branch_id' => $this->branchB->id])
            ->assertRedirect();

        $this->actingAs($supervisor)->get('/orders')
            ->assertInertia(fn ($page) => $page->where('orders.data.0.order_number', $orderB->order_number));
    }
}
