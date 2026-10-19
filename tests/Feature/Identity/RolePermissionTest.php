<?php

namespace Tests\Feature\Identity;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_roles_and_permissions_are_seeded(): void
    {
        $this->assertSame(count(RoleName::cases()), Role::count());
        $this->assertDatabaseHas('roles', ['slug' => RoleName::TenantOwner->value, 'is_system' => true]);
        $this->assertDatabaseHas('permissions', ['slug' => 'pos.use']);
        $this->assertDatabaseHas('permissions', ['slug' => 'platform.tenants.manage']);
    }

    public function test_tenant_owner_receives_all_tenant_permissions_but_no_platform_permissions(): void
    {
        $user = User::factory()->forTenant(Tenant::factory()->create())->create();
        $user->assignRole(RoleName::TenantOwner);

        $this->assertTrue($user->hasPermission('pos.use'));
        $this->assertTrue($user->hasPermission('menu.manage'));
        $this->assertTrue($user->hasPermission('settings.manage'));
        $this->assertFalse($user->hasPermission('platform.tenants.manage'));
        $this->assertFalse($user->hasPermission('platform.impersonate'));
    }

    public function test_cashier_has_limited_operational_permissions(): void
    {
        $user = User::factory()->forTenant(Tenant::factory()->create())->create();
        $user->assignRole(RoleName::Cashier);

        $this->assertTrue($user->hasPermission('pos.use'));
        $this->assertTrue($user->hasPermission('orders.create'));
        $this->assertFalse($user->hasPermission('menu.manage'));
        $this->assertFalse($user->hasPermission('orders.refund'));
        $this->assertFalse($user->hasPermission('staff.manage'));
    }

    public function test_auditor_is_read_only(): void
    {
        $user = User::factory()->forTenant(Tenant::factory()->create())->create();
        $user->assignRole(RoleName::Auditor);

        $this->assertTrue($user->hasPermission('orders.view'));
        $this->assertTrue($user->hasPermission('reports.view'));
        $this->assertFalse($user->hasPermission('orders.create'));
        $this->assertFalse($user->hasPermission('menu.manage'));
    }

    public function test_platform_admin_resolves_platform_permissions_only(): void
    {
        $user = User::factory()->platformAdmin()->create();
        $user->assignRole(RoleName::SaasSuperAdmin);

        $this->assertTrue($user->isPlatformAdmin());
        $this->assertTrue($user->hasPermission('platform.tenants.manage'));
        $this->assertTrue($user->hasPermission('platform.audit.view'));
        $this->assertFalse($user->hasPermission('orders.view'));
        $this->assertFalse($user->hasPermission('settings.manage'));
    }

    public function test_platform_middleware_blocks_tenant_users(): void
    {
        Route::middleware(['web', 'auth', 'platform'])->get('/_test/platform', fn () => 'ok');

        $tenantUser = User::factory()->forTenant(Tenant::factory()->create())->create();

        $this->actingAs($tenantUser)->get('/_test/platform')->assertForbidden();

        $platformAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($platformAdmin)->get('/_test/platform')->assertOk();
    }

    public function test_permission_middleware_enforces_a_single_permission(): void
    {
        Route::middleware(['web', 'auth', 'permission:menu.manage'])->get('/_test/menu', fn () => 'ok');

        $cashier = User::factory()->forTenant(Tenant::factory()->create())->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/_test/menu')->assertForbidden();

        $owner = User::factory()->forTenant(Tenant::factory()->create())->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->get('/_test/menu')->assertOk();
    }
}
