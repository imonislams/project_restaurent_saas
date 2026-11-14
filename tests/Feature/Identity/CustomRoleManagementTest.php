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

    public function test_builtin_roles_can_be_customised_per_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $staff = User::factory()->forTenant($tenant)->create();
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();
        $staff->assignRole($cashier);

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view', 'orders.create', 'orders.void'],
        ])->assertRedirect()->assertSessionHasNoErrors();

        $copy = Role::where('tenant_id', $tenant->id)
            ->where('based_on_role_id', $cashier->id)
            ->firstOrFail();

        $this->assertSame('Cashier', $copy->name);
        $this->assertFalse($copy->is_system);
        $this->assertEqualsCanonicalizing(
            ['orders.view', 'orders.create', 'orders.void'],
            $copy->permissions()->pluck('slug')->all(),
        );

        $staff->refresh();
        $this->assertTrue($staff->roles->pluck('id')->contains($copy->id));
        $this->assertFalse($staff->roles->pluck('id')->contains($cashier->id));

        // The shared global definition is untouched.
        $this->assertFalse($cashier->fresh()->permissions->contains('slug', 'orders.void'));

        // The global system role itself can never be deleted from the tenant screen.
        $this->actingAs($owner)->delete("/roles/{$cashier->id}")->assertForbidden();

        $this->assertDatabaseHas('audit_logs', ['action' => 'role.customized_from_system']);
    }

    public function test_customising_a_system_role_does_not_affect_other_tenants(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $ownerA = $this->owner($tenantA);
        $ownerB = $this->owner($tenantB);
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();

        $this->actingAs($ownerA)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view', 'orders.void'],
        ])->assertRedirect();

        $this->assertDatabaseMissing('roles', [
            'tenant_id' => $tenantB->id,
            'based_on_role_id' => $cashier->id,
        ]);

        // Tenant A no longer sees the global row (it is shadowed by its copy).
        $this->actingAs($ownerA)->get('/roles')->assertOk()->assertInertia(
            fn ($page) => $page->where(
                'roles',
                fn ($roles) => collect($roles)->doesntContain(fn ($role) => $role['id'] === $cashier->id),
            ),
        );

        // Tenant B still sees the untouched global row.
        $this->actingAs($ownerB)->get('/roles')->assertOk()->assertInertia(
            fn ($page) => $page->where(
                'roles',
                fn ($roles) => collect($roles)->contains(fn ($role) => $role['id'] === $cashier->id),
            ),
        );
    }

    public function test_repeated_edits_update_the_same_tenant_copy(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view'],
        ])->assertRedirect();

        $copy = Role::where('tenant_id', $tenant->id)
            ->where('based_on_role_id', $cashier->id)
            ->firstOrFail();

        $this->actingAs($owner)->patch("/roles/{$copy->id}", [
            'name' => 'Cashier Plus',
            'permissions' => ['orders.view', 'orders.approve'],
        ])->assertRedirect();

        $this->assertSame(
            1,
            Role::where('tenant_id', $tenant->id)->where('based_on_role_id', $cashier->id)->count(),
        );
        $this->assertSame('Cashier Plus', $copy->fresh()->name);
        $this->assertEqualsCanonicalizing(
            ['orders.view', 'orders.approve'],
            $copy->permissions()->pluck('slug')->all(),
        );
    }

    public function test_branch_scoped_assignment_is_preserved_when_customising_a_role(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $branch = $tenant->branches()->create(['name' => 'Main', 'code' => 'MAIN']);
        $staff = User::factory()->forTenant($tenant)->create();
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();

        $staff->roles()->attach($cashier->id, ['branch_id' => $branch->id]);

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view'],
        ])->assertRedirect();

        $copy = Role::where('tenant_id', $tenant->id)
            ->where('based_on_role_id', $cashier->id)
            ->firstOrFail();

        $this->assertDatabaseHas('role_user', [
            'user_id' => $staff->id,
            'role_id' => $copy->id,
            'branch_id' => $branch->id,
        ]);
        $this->assertDatabaseMissing('role_user', [
            'user_id' => $staff->id,
            'role_id' => $cashier->id,
        ]);
    }

    public function test_locked_owner_and_admin_roles_cannot_be_customised(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        foreach ([RoleName::TenantOwner, RoleName::TenantAdmin] as $roleName) {
            $role = Role::whereNull('tenant_id')->where('slug', $roleName->value)->firstOrFail();

            $this->actingAs($owner)->patch("/roles/{$role->id}", [
                'name' => $role->name,
                'permissions' => [],
            ])->assertForbidden();
        }

        $this->assertDatabaseCount('roles', 17);
    }

    public function test_owner_can_reset_a_customised_role_to_the_system_default(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $staff = User::factory()->forTenant($tenant)->create();
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();
        $staff->assignRole($cashier);

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view'],
        ])->assertRedirect();

        $copy = Role::where('tenant_id', $tenant->id)
            ->where('based_on_role_id', $cashier->id)
            ->firstOrFail();

        $this->actingAs($owner)->post("/roles/{$copy->id}/reset")->assertRedirect();

        $this->assertDatabaseMissing('roles', ['id' => $copy->id]);
        $staff->refresh();
        $this->assertTrue($staff->roles->pluck('id')->contains($cashier->id));
        $this->assertDatabaseHas('audit_logs', ['action' => 'role.reset_to_system']);
    }

    public function test_staff_role_options_hide_a_shadowed_system_role(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view'],
        ])->assertRedirect();

        $copy = Role::where('tenant_id', $tenant->id)
            ->where('based_on_role_id', $cashier->id)
            ->firstOrFail();

        $this->actingAs($owner)->get('/staff')->assertOk()->assertInertia(
            fn ($page) => $page->where('roles', function ($roles) use ($cashier, $copy) {
                $values = collect($roles)->pluck('value');

                return $values->contains($copy->slug) && ! $values->contains($cashier->slug);
            }),
        );
    }

    public function test_role_ids_resolve_to_the_tenant_copy_for_stale_assignments(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $cashier = Role::whereNull('tenant_id')->where('slug', RoleName::Cashier->value)->firstOrFail();

        $this->actingAs($owner)->patch("/roles/{$cashier->id}", [
            'name' => 'Cashier',
            'permissions' => ['orders.view'],
        ])->assertRedirect();

        $copy = Role::where('tenant_id', $tenant->id)
            ->where('based_on_role_id', $cashier->id)
            ->firstOrFail();

        $this->assertSame([$copy->id], Role::idsForTenant([$cashier->slug], $tenant->id));
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
