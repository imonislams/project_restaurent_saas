<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Platform permissions are resolved from the admin's platform roles — they are
 * never blanket-granted. Each action is guarded server-side ('platform.permission').
 */
class PlatformPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function adminWith(RoleName $role): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole($role);

        return $admin;
    }

    public function test_a_platform_admin_without_any_role_is_forbidden(): void
    {
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)->get('/platform')->assertForbidden();
        $this->actingAs($admin)->get('/platform/tenants')->assertForbidden();
    }

    public function test_super_admin_can_reach_every_platform_area(): void
    {
        $admin = $this->adminWith(RoleName::SaasSuperAdmin);
        Tenant::factory()->create();

        $this->actingAs($admin)->get('/platform')->assertOk();
        $this->actingAs($admin)->get('/platform/tenants')->assertOk();
        $this->actingAs($admin)->get('/platform/plans')->assertOk();
        $this->actingAs($admin)->get('/platform/audit')->assertOk();
    }

    public function test_authenticated_prop_exposes_only_granted_platform_permissions(): void
    {
        $admin = $this->adminWith(RoleName::PlatformAuditor);

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('auth.platform_permissions', fn ($permissions) => collect($permissions)->contains('platform.audit.view')
                    && ! collect($permissions)->contains('platform.tenants.suspend'))
            );
    }

    public function test_support_operator_can_view_tenants_but_not_suspend_or_manage_plans(): void
    {
        $admin = $this->adminWith(RoleName::SupportOperator);
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->get('/platform/tenants')->assertOk();
        $this->actingAs($admin)->get("/platform/tenants/{$tenant->id}")->assertOk();

        // Not granted: suspend, plans, subscriptions.manage.
        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/suspend")->assertForbidden();
        $this->actingAs($admin)->get('/platform/plans')->assertForbidden();
        $this->assertSame('active', $tenant->fresh()->status->value);
    }

    public function test_billing_admin_can_view_plans_but_cannot_configure_gateways(): void
    {
        $admin = $this->adminWith(RoleName::BillingAdmin);

        $this->actingAs($admin)->get('/platform/plans')->assertOk();
        // No route exists yet for gateways; the permission itself is the gate.
        $this->assertFalse($admin->hasPermission('platform.gateways.configure'));
        $this->assertTrue($admin->hasPermission('platform.billing.manage'));
    }

    public function test_platform_auditor_is_read_only(): void
    {
        $admin = $this->adminWith(RoleName::PlatformAuditor);
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->get('/platform/audit')->assertOk();
        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/suspend")->assertForbidden();
        $this->assertFalse($admin->hasPermission('platform.tenants.manage'));
        $this->assertTrue($admin->hasPermission('platform.audit.view'));
    }

    public function test_tenant_users_still_cannot_reach_the_platform_workspace(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->get('/platform')->assertForbidden();
        $this->actingAs($owner)->get('/platform/audit')->assertForbidden();
        $this->assertFalse($owner->hasPermission('platform.audit.view'));
    }

    public function test_tenant_staff_cannot_be_assigned_a_platform_role(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->post('/staff', [
            'email' => 'sneaky@example.com',
            'roles' => [RoleName::PlatformAdmin->value],
        ])->assertSessionHasErrors('roles.0');

        $this->assertDatabaseCount('invitations', 0);
    }
}
