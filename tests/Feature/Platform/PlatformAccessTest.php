<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_tenant_users_cannot_reach_the_platform_workspace(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->get('/platform')->assertForbidden();
        $this->actingAs($owner)->get('/platform/tenants')->assertForbidden();
    }

    public function test_platform_admin_can_view_the_dashboard_and_tenants(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create();

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Dashboard')->has('kpis'));

        $this->actingAs($admin)->get('/platform/tenants')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Tenants/Index')->has('tenants'));

        $this->actingAs($admin)->get('/platform/plans')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Plans')->has('plans'));

        $this->actingAs($admin)->get('/platform/audit')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Audit'));
    }

    public function test_platform_admin_can_suspend_and_reactivate_a_tenant(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/suspend", ['reason' => 'Non-payment'])->assertRedirect();
        $this->assertSame('suspended', $tenant->fresh()->status->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.tenant_suspended']);

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/activate")->assertRedirect();
        $this->assertSame('active', $tenant->fresh()->status->value);
    }

    public function test_impersonation_requires_a_reason_logs_in_as_the_owner_and_is_audited(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        app(SubscriptionService::class)->startTrial($tenant);
        app(TenantContext::class)->forget();

        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        // Missing reason is rejected.
        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/impersonate", [])
            ->assertSessionHasErrors('reason');

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/impersonate", [
            'reason' => 'Investigating a support ticket',
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($owner->fresh());
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.impersonation_started']);

        // The owner's dashboard loads; the impersonation banner state is exposed.
        $this->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->where('impersonation.tenant_id', $tenant->id));
    }

    public function test_stopping_impersonation_restores_the_admin(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/impersonate", [
            'reason' => 'Support',
        ]);
        $this->assertAuthenticatedAs($owner->fresh());

        $this->post('/platform/impersonate/stop')->assertRedirect(route('platform.tenants.index'));

        $this->assertAuthenticatedAs($admin->fresh());
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.impersonation_stopped']);
    }

    public function test_a_suspended_tenant_cannot_be_impersonated(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/suspend", ['reason' => 'Non-payment'])->assertRedirect();

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/impersonate", [
            'reason' => 'Support',
        ])->assertStatus(422);

        $this->assertAuthenticatedAs($admin->fresh());
    }
}
