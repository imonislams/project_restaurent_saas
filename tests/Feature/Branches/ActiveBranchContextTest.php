<?php

namespace Tests\Feature\Branches;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiveBranchContextTest extends TestCase
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

        $this->branchA = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        $this->branchB = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'BR-B']);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function restrictedUser(RoleName $role, array $branchIds): User
    {
        $user = User::factory()->forTenant($this->tenant)->create();
        $user->assignRole($role);
        $user->syncBranchAccess($branchIds);

        return $user;
    }

    public function test_switching_branch_persists_and_drives_every_module(): void
    {
        $this->actingAs($this->owner)
            ->post(route('branch.switch'), ['branch_id' => $this->branchB->id])
            ->assertRedirect();

        $this->assertSame($this->branchB->id, session('active_branch_id'));

        $this->actingAs($this->owner)->get(route('pos.index'))
            ->assertInertia(fn ($page) => $page->where('branch.id', $this->branchB->id));

        $this->actingAs($this->owner)->get(route('tables.index'))
            ->assertInertia(fn ($page) => $page->where('branchId', $this->branchB->id));

        $this->actingAs($this->owner)->get(route('kitchen.index'))
            ->assertInertia(fn ($page) => $page->where('branchId', $this->branchB->id));
    }

    public function test_switching_to_an_inaccessible_branch_is_forbidden(): void
    {
        $cashier = $this->restrictedUser(RoleName::Cashier, [$this->branchA->id]);

        $this->actingAs($cashier)
            ->post(route('branch.switch'), ['branch_id' => $this->branchB->id])
            ->assertForbidden();

        $this->actingAs($cashier)
            ->post(route('branch.switch'), ['branch_id' => $this->branchA->id])
            ->assertRedirect();

        $this->assertSame($this->branchA->id, session('active_branch_id'));
    }

    public function test_a_foreign_tenant_branch_cannot_be_selected(): void
    {
        $cashier = $this->restrictedUser(RoleName::Cashier, [$this->branchA->id]);

        $otherTenant = Tenant::factory()->create();
        $foreignBranch = Branch::factory()->create(['tenant_id' => $otherTenant->id]);

        $this->actingAs($cashier)
            ->post(route('branch.switch'), ['branch_id' => $foreignBranch->id])
            ->assertForbidden();
    }

    public function test_an_inaccessible_session_branch_falls_back_to_an_accessible_one(): void
    {
        $cashier = $this->restrictedUser(RoleName::Cashier, [$this->branchA->id]);

        $this->actingAs($cashier)
            ->withSession(['active_branch_id' => $this->branchB->id])
            ->get(route('pos.index'))
            ->assertInertia(fn ($page) => $page->where('branch.id', $this->branchA->id));
    }

    public function test_branch_switchers_only_list_accessible_branches(): void
    {
        $cashier = $this->restrictedUser(RoleName::Cashier, [$this->branchA->id]);

        $this->actingAs($cashier)->get(route('kitchen.index'))
            ->assertInertia(fn ($page) => $page
                ->has('branches', 1)
                ->where('branches.0.id', $this->branchA->id));

        $this->actingAs($this->owner)->get(route('kitchen.index'))
            ->assertInertia(fn ($page) => $page->has('branches', 2));
    }

    public function test_reports_default_to_the_active_branch_and_gate_all_branches(): void
    {
        $manager = $this->restrictedUser(RoleName::BranchManager, [$this->branchA->id]);

        $this->actingAs($manager)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page
                ->where('filters.branch_id', $this->branchA->id)
                ->where('canViewAllBranches', false));

        $this->actingAs($this->owner)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page->where('canViewAllBranches', true));
    }

    public function test_orders_scope_to_the_active_branch_and_only_allow_all_for_tenant_wide_users(): void
    {
        $manager = $this->restrictedUser(RoleName::BranchManager, [$this->branchA->id]);

        $this->actingAs($manager)->get(route('orders.index'))
            ->assertInertia(fn ($page) => $page
                ->where('filters.branch_id', $this->branchA->id)
                ->where('canViewAllBranches', false));

        // A branch-restricted user cannot widen to every branch.
        $this->actingAs($manager)->get(route('orders.index', ['branch_id' => 'all']))
            ->assertInertia(fn ($page) => $page->where('filters.branch_id', $this->branchA->id));

        // A tenant-wide user may view every branch.
        $this->actingAs($this->owner)->get(route('orders.index', ['branch_id' => 'all']))
            ->assertInertia(fn ($page) => $page->where('filters.branch_id', null));
    }
}
