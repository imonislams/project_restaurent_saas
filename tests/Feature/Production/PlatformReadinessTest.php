<?php

namespace Tests\Feature\Production;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Production readiness checks for the platform control center.
 */
class PlatformReadinessTest extends TestCase
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

    protected function tenantOwner(): User
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        return $owner;
    }

    public function test_every_migration_declares_a_down_method(): void
    {
        foreach (glob(database_path('migrations/*.php')) as $file) {
            $migration = require $file;

            $this->assertTrue(
                method_exists($migration, 'down'),
                basename($file).' is missing a down() method and cannot be rolled back.',
            );
        }
    }

    public function test_every_platform_get_route_is_forbidden_for_tenant_users(): void
    {
        $owner = $this->tenantOwner();

        $routes = collect(Route::getRoutes()->getRoutes())->filter(function ($route) {
            return str_starts_with((string) $route->getName(), 'platform.')
                && in_array('GET', $route->methods(), true)
                && ! str_contains($route->uri(), '{');
        });

        $this->assertNotEmpty($routes, 'No parameterless platform GET routes were found.');

        foreach ($routes as $route) {
            $this->assertSame(
                403,
                $this->actingAs($owner)->get('/'.$route->uri())->getStatusCode(),
                "Route [{$route->uri()}] was not forbidden for a tenant user.",
            );
        }
    }

    public function test_unauthenticated_requests_to_platform_are_redirected(): void
    {
        $this->get('/platform')->assertRedirect(route('login'));
    }

    public function test_control_center_pages_are_reachable_for_the_super_admin(): void
    {
        $admin = $this->admin();

        $pages = [
            '/platform', '/platform/analytics', '/platform/analytics/revenue-reports',
            '/platform/tenants', '/platform/tenants/verification', '/platform/diagnostics', '/platform/support',
            '/platform/plans', '/platform/entitlements', '/platform/coupons', '/platform/subscriptions',
            '/platform/subscriptions/trials', '/platform/subscriptions/past-due', '/platform/subscriptions/cancellations',
            '/platform/usage',
            '/platform/billing/overview', '/platform/invoices', '/platform/billing/credit-notes', '/platform/billing/adjustments',
            '/platform/payments', '/platform/billing/refunds', '/platform/billing/settlements',
            '/platform/gateways', '/platform/gateways/sslcommerz', '/platform/gateways/health',
            '/platform/payments/webhooks', '/platform/payments/gateway-transactions',
            '/platform/email', '/platform/email/logs', '/platform/email/failed', '/platform/email/templates', '/platform/email/settings',
            '/platform/notifications',
            '/platform/ops/queue', '/platform/ops/failed-jobs', '/platform/ops/schedule', '/platform/ops/health',
            '/platform/ops/logs', '/platform/ops/api-errors', '/platform/ops/maintenance-history',
            '/platform/maintenance', '/platform/backups', '/platform/backups/tenants', '/platform/backups/verification', '/platform/restores',
            '/platform/admins', '/platform/roles', '/platform/sessions', '/platform/security-events',
            '/platform/audit', '/platform/impersonation-history',
            '/platform/settings/general', '/platform/settings/branding', '/platform/settings/localization',
            '/platform/settings/billing', '/platform/settings/payments', '/platform/settings/operations',
            '/platform/settings/security', '/platform/settings/retention', '/platform/settings/features',
        ];

        foreach ($pages as $uri) {
            $this->actingAs($admin)->get($uri)->assertOk();
        }
    }

    public function test_gateway_and_email_secrets_are_never_exposed_to_the_browser(): void
    {
        $admin = $this->admin();

        PaymentGateway::create([
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'credentials' => ['store_id' => 'store-123', 'store_password' => 'SUPER-SECRET-PASSWORD'],
        ]);

        $gateways = $this->actingAs($admin)->get('/platform/gateways');
        $gateways->assertOk();
        $this->assertStringNotContainsString('SUPER-SECRET-PASSWORD', $gateways->getContent());

        app(PlatformSettings::class)->set('mail.password', 'EMAIL-SECRET', 'mail', encrypted: true);

        $email = $this->actingAs($admin)->get('/platform/email/settings');
        $email->assertOk();
        $this->assertStringNotContainsString('EMAIL-SECRET', $email->getContent());
    }

    public function test_platform_pages_do_not_leak_across_tenants(): void
    {
        $owner = $this->tenantOwner();

        // A tenant user cannot reach any platform surface, regardless of role.
        $this->actingAs($owner)->get('/platform/tenants')->assertForbidden();
        $this->actingAs($owner)->get('/platform/audit')->assertForbidden();
        $this->actingAs($owner)->get('/platform/settings/general')->assertForbidden();
    }
}
