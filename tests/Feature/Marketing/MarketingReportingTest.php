<?php

namespace Tests\Feature\Marketing;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Marketing\Analytics\AttributionService;
use App\Domain\Marketing\Insights\InsightService;
use App\Domain\Marketing\Models\MarketingAlertRule;
use App\Domain\Marketing\Models\MarketingAttribution;
use App\Domain\Marketing\Models\MarketingInsight;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Reporting\MarketingReportService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Reports, exports and marketing alerts.
 */
class MarketingReportingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function admin(RoleName $role = RoleName::SaasSuperAdmin): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole($role);

        return $admin;
    }

    protected function period(): PlatformPeriod
    {
        return PlatformPeriod::make(null, null, '90d');
    }

    public function test_every_report_carries_a_definition_a_source_and_a_limitation(): void
    {
        $reports = app(MarketingReportService::class)->all($this->period());

        $this->assertNotEmpty($reports);

        foreach ($reports as $report) {
            foreach (['key', 'title', 'definition', 'source', 'limitation', 'columns', 'rows'] as $key) {
                $this->assertArrayHasKey($key, $report, $report['key'] ?? '?'.' is missing '.$key.'.');
            }

            // A number without these is an opinion.
            $this->assertNotSame('', $report['definition']);
            $this->assertNotSame('', $report['limitation']);
        }

        $keys = array_column($reports, 'key');
        $this->assertContains('traffic', $keys);
        $this->assertContains('channels', $keys);
        $this->assertContains('email', $keys);
    }

    public function test_the_reports_screen_renders_for_a_platform_admin(): void
    {
        $this->actingAs($this->admin())
            ->get('/platform/marketing/reports')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Marketing/Reports/Index')
                ->has('reports')
                ->has('insights')
                ->has('rules')
                ->has('metrics')
            );
    }

    public function test_an_export_streams_the_same_rows_and_is_audited(): void
    {
        $response = $this->actingAs($this->admin())
            ->get('/platform/marketing/reports/export/traffic?preset=90d');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('Content-Type'));

        $this->assertDatabaseHas('audit_logs', ['action' => 'marketing.report_exported']);
    }

    public function test_an_unknown_report_is_not_exportable(): void
    {
        $this->actingAs($this->admin())->get('/platform/marketing/reports/export/nope')->assertNotFound();
    }

    public function test_an_export_needs_the_export_permission(): void
    {
        // The support operator holds no marketing permission at all.
        $this->actingAs($this->admin(RoleName::SupportOperator))
            ->get('/platform/marketing/reports/export/traffic')
            ->assertForbidden();

        // The auditor holds export, so it may take the file.
        $this->actingAs($this->admin(RoleName::PlatformAuditor))
            ->get('/platform/marketing/reports/export/traffic')
            ->assertOk();
    }

    public function test_alert_rules_are_seeded_once_and_can_fire(): void
    {
        $insights = app(InsightService::class);

        $this->assertSame(4, $insights->ensureRules());
        $this->assertSame(0, $insights->ensureRules());

        // A breach the default rules would not catch, with a zero threshold.
        MarketingLead::create([
            'name' => 'Unassigned',
            'email' => 'unassigned@restaurant.test',
            'source' => 'contact_form',
            'status' => 'new',
        ]);

        MarketingAlertRule::create([
            'key' => 'test_unworked',
            'name' => 'Unworked leads',
            'metric' => 'unworked_leads',
            'operator' => 'gt',
            'threshold' => 0,
            'window' => '24h',
            'is_enabled' => true,
            'cooldown_minutes' => 60,
        ]);

        $first = $insights->evaluate();

        $this->assertSame(1, $first['fired']);
        $this->assertSame(1, MarketingInsight::query()->count());

        // Cooling down: the same breach must not alert again.
        $second = $insights->evaluate();

        $this->assertSame(0, $second['fired']);
        $this->assertSame(1, MarketingInsight::query()->count());
    }

    public function test_a_metric_that_cannot_be_computed_is_skipped_not_treated_as_zero(): void
    {
        // No customers active at the start, so churn has no denominator.
        $metrics = app(InsightService::class)->metrics($this->period());

        $this->assertNull($metrics['churn_rate']['value']);
        $this->assertNotNull($metrics['churn_rate']['reason']);

        $result = app(InsightService::class)->evaluate();

        // The churn rule cannot fire on a missing value.
        $this->assertSame(0, MarketingInsight::query()->where('title', 'Churn is higher than usual')->count());
        $this->assertGreaterThanOrEqual(0, $result['evaluated']);
    }

    public function test_an_insight_can_be_acknowledged(): void
    {
        $admin = $this->admin();

        $insight = MarketingInsight::create([
            'severity' => 'warning',
            'title' => 'Something happened',
            'body' => 'A detail.',
            'generated_at' => now(),
        ]);

        $this->actingAs($admin)
            ->post(route('platform.marketing.reports.acknowledge', $insight->id))
            ->assertSessionHas('success');

        $insight->refresh();

        $this->assertNotNull($insight->acknowledged_at);
        $this->assertSame($admin->getKey(), $insight->acknowledged_by);
    }

    public function test_the_scheduled_commands_run(): void
    {
        $this->artisan('marketing:generate-sitemap')->assertSuccessful();
        $this->artisan('marketing:prune-events')->assertSuccessful();
        $this->artisan('marketing:refresh-attribution')->assertSuccessful();
        $this->artisan('marketing:evaluate-alerts')->assertSuccessful();
        $this->artisan('marketing:sync-integrations')->assertSuccessful();
    }

    public function test_refreshing_attribution_picks_up_settled_revenue(): void
    {
        $tenant = Tenant::factory()->create();

        app(AttributionService::class)->attribute($tenant);

        SubscriptionInvoice::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->getKey(),
            'number' => 'INV-TEST-1',
            'billing_cycle' => 'monthly',
            'amount' => 120,
            'subtotal' => 120,
            'currency' => 'USD',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        app(AttributionService::class)->refreshAll();

        $attribution = MarketingAttribution::query()->firstOrFail();

        $this->assertSame('120.00', (string) $attribution->value);
        $this->assertSame('USD', $attribution->currency);
    }
}
