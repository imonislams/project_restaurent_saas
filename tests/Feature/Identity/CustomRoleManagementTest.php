<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomRoleManagementTest extends TestCase
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

    protected function customRole(Tenant $tenant, string $name, array $permissions = []): Role
    {
        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => $name,
            'slug' => strtolower(str_replace(' ', '-', $name)),
            'description' => null,
            'is_system' => false,
        ]);

        $role->permissions()->sync(Permission::whereIn('slug', $permissions)->pluck('id')->all());

        return $role;
    }

    public function test_owner_can_view_the_roles_page(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)
            ->get('/roles')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Roles/Index'));
    }

    public function test_user_without_roles_view_cannot_view_the_roles_page(): void
    {
        $tenant = Tenant::factory()->create();
        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/roles')->assertForbidden();
    }

    public function test_owner_can_create_a_custom_role_with_permissions(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)->post('/roles', [
            'name' => 'Branch Supervisor',
            'description' => 'Runs a single branch',
            'permissions' => ['orders.view', 'orders.create', 'tables.view'],
        ])->assertRedirect();

        $role = Role::where('slug', 'branch-supervisor')->firstOrFail();

        $this->assertSame($tenant->id, $role->tenant_id);
        $this->assertFalse($role->is_system);
        $this->assertEqualsCanonicalizing(
            ['orders.view', 'orders.create', 'tables.view'],
            $role->permissions()->pluck('slug')->all(),
        );

        $this->assertDatabaseHas('audit_logs', ['action' => 'role.created']);
    }

    public function test_role_name_must_be_unique_within_the_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $this->customRole($tenant, 'Waiter');

        $this->actingAs($owner)->post('/roles', [
            'name' => 'Waiter',
            'permissions' => ['orders.view'],
        ])->assertSessionHasErrors('name');
    }

    public function test_permission_identifiers_are_validated_against_the_registry(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)->post('/roles', [
            'name' => 'Bogus Role',
            'permissions' => ['orders.teleport'],
        ])->assertSessionHasErrors('permissions.0');

        $this->actingAs($owner)->post('/roles', [
            'name' => 'Sneaky Role',
            'permissions' => ['platform.tenants.manage'],
        ])->assertSessionHasErrors('permissions.0');
    }

    public function test_actor_cannot_grant_permissions_they_do_not_hold(): void
    {
        $tenant = Tenant::factory()->create();
        $shiftLead = User::factory()->forTenant($tenant)->create();

        $role = $this->customRole($tenant, 'Shift Lead', ['roles.view', 'roles.manage', 'orders.view']);
        $shiftLead->assignRole($role);

        $this->actingAs($shiftLead)->post('/roles', [
            'name' => 'Finance Helper',
            'permissions' => ['orders.refund'],
        ])->assertSessionHasErrors('permissions');
    }

    public function test_owner_can_update_custom_role_permissions(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $role = $this->customRole($tenant, 'Waiter', ['orders.view']);

        $this->actingAs($owner)->patch("/roles/{$role->id}", [
            'name' => 'Waiter',
            'permissions' => ['orders.view', 'orders.create', 'tables.view'],
        ])->assertRedirect();

        $this->assertEqualsCanonicalizing(
            ['orders.view', 'orders.create', 'tables.view'],
            $role->fresh()->permissions()->pluck('slug')->all(),
        );

        $this->assertDatabaseHas('audit_logs', ['action' => 'role.permissions_updated']);
    }

    public function test_system_roles_cannot_be_edited_or_deleted(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Hacked Cashier',
            'permissions' => ['orders.void'],
        ])->assertForbidden();

        $this->actingAs($owner)->delete("/roles/{$cashier->id}")->assertForbidden();
    }

    public function test_owner_cannot_manage_another_tenants_custom_role(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $ownerA = $this->owner($tenantA);
        $roleB = $this->customRole($tenantB, 'Their Role', ['orders.view']);

        $this->actingAs($ownerA)->patch("/roles/{$roleB->id}", [
            'name' => 'Their Role',
            'permissions' => ['orders.view'],
        ])->assertForbidden();

        $this->actingAs($ownerA)->delete("/roles/{$roleB->id}")->assertForbidden();
    }

    public function test_role_assigned_to_users_cannot_be_deleted_then_can_once_freed(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $role = $this->customRole($tenant, 'Waiter', ['orders.view']);

        $staff = User::factory()->forTenant($tenant)->create();
        $staff->assignRole($role);

        $this->actingAs($owner)->delete("/roles/{$role->id}")->assertSessionHasErrors('role');
        $this->assertDatabaseHas('roles', ['id' => $role->id]);

        $staff->roles()->detach();

        $this->actingAs($owner)->delete("/roles/{$role->id}")->assertRedirect();
        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'role.deleted']);
    }

    public function test_owner_can_assign_a_custom_role_to_staff(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $role = $this->customRole($tenant, 'Waiter', ['orders.view', 'orders.create']);
        $staff = User::factory()->forTenant($tenant)->create();

        $this->actingAs($owner)->patch("/staff/{$staff->id}", [
            'roles' => [$role->slug],
            'branch_ids' => [],
        ])->assertRedirect();

        $this->assertTrue($staff->fresh()->hasRole($role->slug));
    }
}
