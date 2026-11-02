<?php

namespace Tests\Feature\Marketing;

use App\Domain\Marketing\Analytics\AttributionService;
use App\Domain\Marketing\Analytics\MarketingAnalyticsService;
use App\Domain\Marketing\Models\MarketingAttribution;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\Models\MarketingCampaignSpend;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The maths behind the growth screens.
 *
 * What is asserted here is the documented formula, not an implementation detail: a
 * touchpoint outside the window does not qualify, a customer is attributed once per
 * model, and money is never summed across currencies.
 */
class MarketingAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function period(): PlatformPeriod
    {
        return PlatformPeriod::make(null, null, '90d');
    }

    protected function plan(string $currency, float $monthly): Plan
    {
        return Plan::create([
            'name' => 'Plan '.$currency,
            'slug' => 'plan-'.strtolower($currency),
            'currency' => $currency,
            'price_monthly' => $monthly,
            'price_yearly' => 0,
            'trial_days' => 14,
            'features' => [],
            'limits' => [],
            'is_active' => true,
            'visibility' => 'public',
            'sort_order' => 0,
        ]);
    }

    protected function visitor(array $overrides = []): MarketingVisitor
    {
        return MarketingVisitor::create(array_merge([
            'visitor_id' => (string) Str::uuid(),
            'first_seen_at' => Carbon::now()->subDays(3),
            'last_seen_at' => Carbon::now()->subDay(),
            'first_source' => 'google',
            'first_medium' => 'cpc',
            'first_campaign' => 'winter',
            'last_source' => 'facebook',
            'last_medium' => 'paid',
            'channel' => 'google_ads',
            'device' => 'desktop',
        ], $overrides));
    }

    public function test_attribution_writes_one_row_per_model_and_never_duplicates(): void
    {
        $visitor = $this->visitor();
        $tenant = Tenant::factory()->create();
        MarketingLead::create([
            'name' => 'A',
            'email' => 'a@restaurant.test',
            'source' => 'contact_form',
            'status' => 'converted',
            'visitor_id' => $visitor->visitor_id,
            'tenant_id' => $tenant->getKey(),
            'converted_at' => now(),
        ]);

        $service = app(AttributionService::class);

        $this->assertSame(2, $service->attribute($tenant));
        $this->assertSame(0, $service->attribute($tenant), 'A second run must add nothing.');

        $this->assertSame(2, MarketingAttribution::query()->count());
        $this->assertDatabaseHas('marketing_attributions', ['tenant_id' => $tenant->getKey(), 'model' => 'first_touch']);
        $this->assertDatabaseHas('marketing_attributions', ['tenant_id' => $tenant->getKey(), 'model' => 'last_touch']);
    }

    public function test_first_and_last_touch_resolve_to_their_own_source(): void
    {
        $visitor = $this->visitor();
        $tenant = Tenant::factory()->create();
        MarketingLead::create([
            'name' => 'B', 'email' => 'b@restaurant.test', 'source' => 'contact_form',
            'status' => 'converted', 'visitor_id' => $visitor->visitor_id,
            'tenant_id' => $tenant->getKey(), 'converted_at' => now(),
        ]);

        app(AttributionService::class)->attribute($tenant);

        $this->assertSame('google', MarketingAttribution::query()->where('model', 'first_touch')->value('source'));
        $this->assertSame('facebook', MarketingAttribution::query()->where('model', 'last_touch')->value('source'));
    }

    public function test_a_touchpoint_outside_the_window_does_not_qualify(): void
    {
        app(PlatformSettings::class)->set('marketing.attribution_window_days', 7, 'marketing');

        $visitor = $this->visitor([
            'first_seen_at' => Carbon::now()->subDays(120),
            'last_seen_at' => Carbon::now()->subDays(100),
        ]);

        $tenant = Tenant::factory()->create();
        MarketingLead::create([
            'name' => 'C', 'email' => 'c@restaurant.test', 'source' => 'contact_form',
            'status' => 'converted', 'visitor_id' => $visitor->visitor_id,
            'tenant_id' => $tenant->getKey(), 'converted_at' => now(),
        ]);

        app(AttributionService::class)->attribute($tenant);

        $rows = MarketingAttribution::query()->get();

        foreach ($rows as $row) {
            $this->assertNull($row->touchpoint_at, 'A stale touchpoint must not qualify.');
            $this->assertSame('direct', $row->channel->value, 'It is reported as direct rather than dropped.');
        }
    }

    public function test_attribution_with_no_visitor_is_reported_as_direct(): void
    {
        $tenant = Tenant::factory()->create();

        app(AttributionService::class)->attribute($tenant);

        $this->assertSame(2, MarketingAttribution::query()->count());
        $this->assertSame(2, MarketingAttribution::query()->where('channel', 'direct')->count());
    }

    public function test_churn_rate_is_cancellations_over_customers_active_at_the_start(): void
    {
        $plan = $this->plan('USD', 100);

        $cancelled = Tenant::factory()->create();
        $cancelled->subscription()->update(['plan_id' => $plan->getKey(), 'status' => SubscriptionStatus::Cancelled->value]);
        $cancelled->subscription->forceFill(['created_at' => now()->subDays(120), 'cancelled_at' => now()->subDay()])->save();

        $retained = Tenant::factory()->create();
        $retained->subscription()->update(['plan_id' => $plan->getKey()]);
        $retained->subscription->forceFill(['created_at' => now()->subDays(120)])->save();

        $retention = app(MarketingAnalyticsService::class)->retention($this->period());

        $this->assertSame(2, $retention['active_at_start']);
        $this->assertSame(1, $retention['churned']);
        $this->assertSame(50.0, $retention['churn_rate']);
        $this->assertSame(50.0, $retention['retention_rate']);
    }

    public function test_a_cohort_reports_its_own_retention(): void
    {
        Tenant::factory()->count(3)->create();

        $cohorts = app(MarketingAnalyticsService::class)->cohorts(2);

        $current = $cohorts[count($cohorts) - 1];

        $this->assertSame(3, $current['signups']);
        $this->assertSame(3, $current['active']);
        $this->assertSame(100.0, $current['retention']);
    }

    public function test_cac_and_roas_are_produced_per_currency_only(): void
    {
        $usd = $this->plan('USD', 100);
        $bdt = $this->plan('BDT', 5000);

        $campaign = MarketingCampaign::create(['name' => 'Winter', 'slug' => 'winter', 'channel' => 'google_ads']);

        MarketingCampaignSpend::create([
            'campaign_id' => $campaign->getKey(),
            'period_start' => now()->subDays(5)->toDateString(),
            'period_end' => now()->toDateString(),
            'amount' => 500, 'currency' => 'USD', 'source' => 'manual',
        ]);

        MarketingCampaignSpend::create([
            'campaign_id' => $campaign->getKey(),
            'period_start' => now()->subDays(5)->toDateString(),
            'period_end' => now()->toDateString(),
            'amount' => 20000, 'currency' => 'BDT', 'source' => 'google_ads',
        ]);

        $tenant = Tenant::factory()->create();
        $tenant->subscription()->update(['plan_id' => $usd->getKey(), 'current_period_start' => now()]);

        MarketingAttribution::create([
            'tenant_id' => $tenant->getKey(), 'model' => 'last_touch', 'channel' => 'google_ads',
            'value' => 1000, 'currency' => 'USD', 'converted_at' => now()->subDay(),
        ]);

        $rows = collect(app(MarketingAnalyticsService::class)->efficiency($this->period()))->keyBy('currency');

        $this->assertTrue($rows->has('USD'));
        $this->assertTrue($rows->has('BDT'));

        // One new paying restaurant, 500 spent in USD.
        $this->assertSame(500.0, $rows['USD']['cac']);
        $this->assertSame(2.0, $rows['USD']['roas']);
        $this->assertTrue($rows['USD']['spend_is_manual'], 'Manual spend must be labelled.');

        // BDT spend exists but no BDT customer converted, so CAC has a reason not a number.
        $this->assertNull($rows['BDT']['cac']);
        $this->assertNotNull($rows['BDT']['cac_reason']);
        $this->assertFalse($rows['BDT']['spend_is_manual']);
    }

    public function test_lifetime_value_is_reported_per_currency(): void
    {
        Tenant::factory()->create();
        Tenant::factory()->create();

        $lifetime = app(MarketingAnalyticsService::class)->lifetimeValue();

        $this->assertSame(2, $lifetime['customers']);
        $this->assertIsArray($lifetime['per_currency']);
        $this->assertStringContainsString('Observed', $lifetime['note']);
    }

    public function test_the_funnel_reports_conversion_and_drop_off_between_steps(): void
    {
        $funnel = app(MarketingAnalyticsService::class)->funnel($this->period());

        $this->assertCount(10, $funnel['steps']);

        foreach ($funnel['steps'] as $index => $step) {
            if ($index === 0) {
                $this->assertNull($step['conversion_rate']);
            } else {
                $this->assertArrayHasKey('conversion_rate', $step);
                $this->assertArrayHasKey('drop_off', $step);
            }
        }
    }

    public function test_the_attribution_screen_payload_keeps_models_and_totals_separate(): void
    {
        $payload = app(MarketingAnalyticsService::class)->attribution($this->period());

        $this->assertArrayHasKey('models', $payload);
        $this->assertArrayHasKey('first_touch', $payload['models']);
        $this->assertArrayHasKey('last_touch', $payload['models']);
        $this->assertArrayHasKey('total_revenue', $payload);
        $this->assertIsArray($payload['total_revenue'], 'Total revenue is per currency, never a single number.');
    }
}
