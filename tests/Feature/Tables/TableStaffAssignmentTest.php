<?php

namespace Tests\Feature\Tables;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableStaffService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableStaffAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->owner, 100);
    }

    /**
     * @param  list<int>  $branchIds
     */
    protected function staff(RoleName $role, array $branchIds = []): User
    {
        $user = User::factory()->forTenant($this->tenant)->create();
        $user->assignRole($role);
        $user->syncBranchAccess($branchIds);

        return $user->fresh();
    }

    protected function table(string $name = 'T1'): Table
    {
        return Table::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => $name,
            'seats' => 4,
        ]);
    }

    protected function openOrderAt(Table $table): Order
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->owner)->post('/pos/orders/open', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'covers' => 2,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertRedirect();

        return Order::latest('id')->firstOrFail();
    }

    public function test_a_table_can_be_created_with_assigned_staff(): void
    {
        $cashier = $this->staff(RoleName::Cashier, [$this->branch->id]);

        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'seats' => 4,
            'staff_ids' => [$cashier->id],
        ])->assertRedirect();

        $table = Table::firstOrFail();
        $this->assertDatabaseHas('table_staff', [
            'tenant_id' => $this->tenant->id,
            'table_id' => $table->id,
            'user_id' => $cashier->id,
        ]);
    }

    public function test_a_table_can_be_created_without_staff(): void
    {
        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'seats' => 4,
        ])->assertRedirect();

        $this->assertDatabaseCount('tables', 1);
        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_inactive_staff_cannot_be_assigned(): void
    {
        $cashier = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $cashier->forceFill(['status' => 'deactivated', 'deactivated_at' => now()])->save();

        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$cashier->id],
        ])->assertSessionHasErrors('staff_ids.0');

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_staff_without_branch_access_cannot_be_assigned(): void
    {
        $cashier = $this->staff(RoleName::Cashier, []);

        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$cashier->id],
        ])->assertSessionHasErrors('staff_ids.0');

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_staff_without_a_serving_permission_cannot_be_assigned(): void
    {
        $kitchen = $this->staff(RoleName::KitchenStaff, [$this->branch->id]);

        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$kitchen->id],
        ])->assertSessionHasErrors('staff_ids.0');

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_foreign_tenant_staff_cannot_be_assigned(): void
    {
        $otherTenant = Tenant::factory()->create();
        $foreign = User::factory()->forTenant($otherTenant)->create();
        $foreign->assignRole(RoleName::Cashier);

        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$foreign->id],
        ])->assertSessionHasErrors('staff_ids.0');

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_a_user_without_manage_permission_cannot_create_a_table(): void
    {
        $cashier = $this->staff(RoleName::Cashier, [$this->branch->id]);

        $this->actingAs($cashier)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ])->assertForbidden();
    }

    public function test_opening_a_table_order_snapshots_the_assigned_staff(): void
    {
        $cashier = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashier->id], ['tenant_id' => $this->tenant->id]);

        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->owner)->post('/pos/orders/open', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'covers' => 2,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertRedirect();

        $order = Order::latest('id')->firstOrFail();

        $this->assertDatabaseHas('order_staff', [
            'order_id' => $order->id,
            'user_id' => $cashier->id,
            'name' => $cashier->name,
        ]);
    }

    public function test_changing_table_staff_does_not_rewrite_an_existing_order_snapshot(): void
    {
        $cashierA = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $cashierB = $this->staff(RoleName::Supervisor, [$this->branch->id]);

        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashierA->id], ['tenant_id' => $this->tenant->id]);

        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->owner)->post('/pos/orders/open', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'covers' => 2,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertRedirect();

        $order = Order::latest('id')->firstOrFail();

        // Reassign the table after the order exists.
        app(TableStaffService::class)->sync($table, [$cashierB->id], $this->owner);

        $this->assertDatabaseHas('order_staff', ['order_id' => $order->id, 'user_id' => $cashierA->id]);
        $this->assertDatabaseMissing('order_staff', ['order_id' => $order->id, 'user_id' => $cashierB->id]);
        $this->assertDatabaseHas('table_staff', ['table_id' => $table->id, 'user_id' => $cashierB->id]);
    }

    public function test_the_tables_page_exposes_assigned_and_assignable_staff(): void
    {
        $cashier = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashier->id], ['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->owner)
            ->get('/tables')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Tables/Index')
                ->has('staffByBranch')
                ->has('tables', 1)
                ->where('tables.0.staff.0.id', $cashier->id)
                ->where(
                    "staffByBranch.{$this->branch->id}",
                    fn ($staff) => collect($staff)->pluck('id')->contains($cashier->id),
                )
            );
    }

    public function test_table_staff_can_be_changed_on_update(): void
    {
        $cashierA = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $cashierB = $this->staff(RoleName::Supervisor, [$this->branch->id]);

        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashierA->id], ['tenant_id' => $this->tenant->id]);

        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$cashierB->id],
        ])->assertRedirect();

        $this->assertDatabaseMissing('table_staff', ['table_id' => $table->id, 'user_id' => $cashierA->id]);
        $this->assertDatabaseHas('table_staff', ['table_id' => $table->id, 'user_id' => $cashierB->id]);
    }

    public function test_table_staff_can_be_added_and_removed_on_update(): void
    {
        $cashierA = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $cashierB = $this->staff(RoleName::Supervisor, [$this->branch->id]);

        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashierA->id], ['tenant_id' => $this->tenant->id]);

        // Add a second staff member.
        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$cashierA->id, $cashierB->id],
        ])->assertRedirect();

        $this->assertDatabaseHas('table_staff', ['table_id' => $table->id, 'user_id' => $cashierA->id]);
        $this->assertDatabaseHas('table_staff', ['table_id' => $table->id, 'user_id' => $cashierB->id]);

        // Remove all assignments.
        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [],
        ])->assertRedirect();

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_ineligible_staff_cannot_be_assigned_on_update(): void
    {
        $table = $this->table();
        $kitchen = $this->staff(RoleName::KitchenStaff, [$this->branch->id]);

        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$kitchen->id],
        ])->assertSessionHasErrors('staff_ids.0');

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_staff_from_another_branch_cannot_be_assigned_on_update(): void
    {
        $otherBranch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'BR2']);
        $branchTwoStaff = $this->staff(RoleName::Cashier, [$otherBranch->id]);

        $table = $this->table();

        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$branchTwoStaff->id],
        ])->assertSessionHasErrors('staff_ids.0');

        $this->assertDatabaseCount('table_staff', 0);
    }

    public function test_editing_staff_does_not_rewrite_an_active_order_snapshot(): void
    {
        $cashierA = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $cashierB = $this->staff(RoleName::Supervisor, [$this->branch->id]);

        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashierA->id], ['tenant_id' => $this->tenant->id]);

        $order = $this->openOrderAt($table);

        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$cashierB->id],
        ])->assertRedirect()->assertSessionHas('success');

        // The active order keeps its original staff; the table holds the new one.
        $this->assertDatabaseHas('order_staff', ['order_id' => $order->id, 'user_id' => $cashierA->id]);
        $this->assertDatabaseMissing('order_staff', ['order_id' => $order->id, 'user_id' => $cashierB->id]);
        $this->assertDatabaseHas('table_staff', ['table_id' => $table->id, 'user_id' => $cashierB->id]);
    }

    public function test_a_new_order_after_edit_snapshots_the_new_staff(): void
    {
        $cashierA = $this->staff(RoleName::Cashier, [$this->branch->id]);
        $cashierB = $this->staff(RoleName::Supervisor, [$this->branch->id]);

        $table = $this->table();
        $table->staff()->syncWithPivotValues([$cashierA->id], ['tenant_id' => $this->tenant->id]);

        $first = $this->openOrderAt($table);

        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'staff_ids' => [$cashierB->id],
        ])->assertRedirect();

        $second = $this->openOrderAt($table);

        $this->assertDatabaseHas('order_staff', ['order_id' => $first->id, 'user_id' => $cashierA->id]);
        $this->assertDatabaseHas('order_staff', ['order_id' => $second->id, 'user_id' => $cashierB->id]);
    }
}
