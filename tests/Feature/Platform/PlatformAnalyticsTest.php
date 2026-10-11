<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformAnalyticsTest extends TestCase
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

    /** @return array{0: Tenant, 1: User} */
    protected function activeTenant(): array
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();

        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        app(SubscriptionService::class)->activate($subscription, $owner);

        return [$tenant->fresh(), $owner];
    }

    public function test_dashboard_exposes_kpis_charts_health_and_activity(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create();

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Dashboard')
                ->has('kpis')
                ->has('charts.revenue_trend')
                ->has('charts.subscription_movement')
                ->has('charts.tenant_growth')
                ->has('charts.revenue_by_plan')
                ->has('charts.subscriptions_by_status')
                ->has('health')
                ->has('healthSummary')
                ->has('activity')
                ->has('methodology'));
    }

    public function test_mrr_and_arr_reflect_active_monthly_subscriptions(): void
    {
        $this->activeTenant();
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page->where('kpis', function ($kpis) {
                $mrr = collect($kpis)->firstWhere('key', 'mrr');
                $arr = collect($kpis)->firstWhere('key', 'arr');

                return abs((float) $mrr['value'] - 29.0) < 0.001
                    && abs((float) $arr['value'] - 348.0) < 0.001;
            }));
    }

    public function test_collected_revenue_counts_paid_invoices_this_month(): void
    {
        [, $owner] = $this->activeTenant();
        $tenant = $owner->tenant;
        $subscription = $tenant->subscription;

        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);
        app(SubscriptionService::class)->payInvoice($invoice, $owner);

        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page->where('kpis', function ($kpis) {
                $collected = collect($kpis)->firstWhere('key', 'collected');

                return abs((float) $collected['value'] - 29.0) < 0.001;
            }));
    }

    public function test_trial_conversion_is_reported_for_converted_subscriptions(): void
    {
        $this->activeTenant();
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page->where('kpis', function ($kpis) {
                $conversion = collect($kpis)->firstWhere('key', 'trial_conversion');

                return abs((float) $conversion['value'] - 100.0) < 0.001;
            }));
    }

    public function test_gateway_metrics_are_reported_as_unavailable_not_fabricated(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform')->assertOk()
            ->assertInertia(fn ($page) => $page->where('kpis', function ($kpis) {
                $failed = collect($kpis)->firstWhere('key', 'failed_payments');
                $refunds = collect($kpis)->firstWhere('key', 'refunds');

                return $failed['available'] === false
                    && $failed['value'] === null
                    && $refunds['available'] === false;
            }));
    }

    public function test_revenue_analytics_page_renders_with_a_period_filter(): void
    {
        $this->activeTenant();
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform/analytics?preset=month')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/RevenueAnalytics')
                ->has('kpis')
                ->has('charts.revenue_trend')
                ->where('period.preset', 'month'));
    }

    public function test_revenue_analytics_requires_the_platform_dashboard_permission(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::PlatformAuditor); // has dashboard.view

        $this->actingAs($admin)->get('/platform/analytics')->assertOk();

        $noRole = User::factory()->platformAdmin()->create();
        $this->actingAs($noRole)->get('/platform/analytics')->assertForbidden();
    }
}
