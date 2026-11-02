<?php

namespace Tests\Feature\Marketing;

use App\Domain\Marketing\MarketingOverviewService;
use App\Domain\Marketing\Models\MarketingAttribution;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\Models\MarketingCampaignSpend;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * The dashboard's arithmetic.
 *
 * The rule under test throughout: money is grouped by currency and never summed
 * across currencies, and a metric with no source reports the reason instead of a
 * number.
 */
class MarketingOverviewTest extends TestCase
{
    use RefreshDatabase;

    protected MarketingOverviewService $overview;

    protected function setUp(): void
    {
        parent::setUp();

        $this->overview = app(MarketingOverviewService::class);
    }

    protected function period(): PlatformPeriod
    {
        return PlatformPeriod::make(null, null, '30d');
    }

    protected function plan(string $slug, string $currency, float $monthly, float $yearly = 0): Plan
    {
        return Plan::create([
            'name' => strtoupper($slug),
            'slug' => $slug,
            'currency' => $currency,
            'price_monthly' => $monthly,
            'price_yearly' => $yearly,
            'trial_days' => 14,
            'features' => [],
            'limits' => [],
            'is_active' => true,
            'visibility' => 'public',
            'sort_order' => 0,
        ]);
    }

    protected function tenantOnPlan(Plan $plan, string $cycle = 'monthly', SubscriptionStatus $status = SubscriptionStatus::Active): Tenant
    {
        $tenant = Tenant::factory()->create();

        $tenant->subscription()->update([
            'plan_id' => $plan->getKey(),
            'billing_cycle' => $cycle,
            'status' => $status,
        ]);

        return $tenant->fresh();
    }

    /** @return array<string, mixed> */
    protected function item(string $block, string $key): array
    {
        $blocks = collect($this->overview->blocks($this->period()))->keyBy('key');
        $items = collect($blocks[$block]['items'])->keyBy('key');

        return $items[$key];
    }

    public function test_mrr_is_grouped_per_currency_and_never_summed_together(): void
    {
        $this->tenantOnPlan($this->plan('usd-pro', 'USD', 100));
        $this->tenantOnPlan($this->plan('bdt-pro', 'BDT', 5000));

        $mrr = $this->overview->mrrByCurrency();

        $this->assertSame(['BDT' => 5000.0, 'USD' => 100.0], $mrr);
        $this->assertCount(2, $mrr, 'Currencies must stay separate.');
    }

    public function test_a_yearly_plan_is_normalised_to_a_monthly_figure(): void
    {
        $this->tenantOnPlan($this->plan('yearly-pro', 'USD', 120, 1200), 'yearly');

        $this->assertSame(['USD' => 100.0], $this->overview->mrrByCurrency());
    }

    public function test_mrr_reports_a_reason_when_there_is_nothing_to_report(): void
    {
        $item = $this->item('subscription', 'mrr');

        $this->assertFalse($item['available']);
        $this->assertNull($item['value']);
        $this->assertStringContainsString('No active subscription', (string) $item['reason']);
    }

    public function test_a_currency_breakdown_is_produced_for_every_money_metric(): void
    {
        $this->tenantOnPlan($this->plan('usd-pro', 'USD', 250));

        $this->assertTrue($this->item('subscription', 'mrr_usd')['available']);
        $this->assertSame('USD', $this->item('subscription', 'mrr_usd')['currency']);
        // ARR is a run rate, not collected revenue.
        $this->assertSame(3000.0, (float) $this->item('subscription', 'arr_usd')['value']);
        $this->assertSame(250.0, (float) $this->item('subscription', 'arpa_usd')['value']);
    }

    public function test_marketing_spend_is_reported_as_unavailable_when_nothing_has_been_recorded(): void
    {
        $spend = $this->item('marketing', 'spend');

        $this->assertFalse($spend['available']);
        $this->assertStringContainsString('No campaign spend', (string) $spend['reason']);
    }

    public function test_manually_entered_spend_is_labelled_and_is_the_only_basis_for_cac(): void
    {
        $campaign = MarketingCampaign::create([
            'name' => 'Winter launch',
            'slug' => 'winter-launch',
            'channel' => 'google_ads',
        ]);

        MarketingCampaignSpend::create([
            'campaign_id' => $campaign->getKey(),
            'period_start' => Carbon::now()->subDays(10)->toDateString(),
            'period_end' => Carbon::now()->toDateString(),
            'channel' => 'google_ads',
            'amount' => 500,
            'currency' => 'USD',
            'source' => 'manual',
        ]);

        $this->tenantOnPlan($this->plan('usd-pro', 'USD', 100));

        $spend = $this->item('marketing', 'spend_usd');
        $this->assertTrue($spend['available']);
        $this->assertSame(500.0, (float) $spend['value']);
        $this->assertStringContainsString('manually', (string) $spend['hint']);

        // One paying restaurant in the period, 500 spent.
        $cac = $this->item('marketing', 'cac_usd');
        $this->assertTrue($cac['available']);
        $this->assertSame(500.0, (float) $cac['value']);
        $this->assertSame('USD', $cac['currency']);
    }

    public function test_roas_is_reported_as_undefined_rather_than_divided_by_zero(): void
    {
        $campaign = MarketingCampaign::create(['name' => 'C', 'slug' => 'c']);
        $tenant = $this->tenantOnPlan($this->plan('usd-pro', 'USD', 100));

        MarketingAttribution::create([
            'tenant_id' => $tenant->getKey(),
            'model' => 'first_touch',
            'channel' => 'google_ads',
            'value' => 200,
            'currency' => 'USD',
            'converted_at' => Carbon::now()->subDay(),
        ]);

        // No spend recorded in USD, so ROAS has no denominator.
        $roas = $this->item('marketing', 'roas_USD');

        $this->assertFalse($roas['available']);
        $this->assertNull($roas['value']);
        $this->assertStringContainsString('No spend recorded', (string) $roas['reason']);
    }

    public function test_attributed_revenue_is_reported_per_currency_separately(): void
    {
        $campaign = MarketingCampaign::create(['name' => 'C2', 'slug' => 'c2']);

        foreach (['USD' => 200, 'BDT' => 30000] as $currency => $value) {
            $tenant = $this->tenantOnPlan($this->plan('plan-'.strtolower($currency), $currency, 100));

            MarketingAttribution::create([
                'tenant_id' => $tenant->getKey(),
                'model' => 'first_touch',
                'channel' => 'google_ads',
                'value' => $value,
                'currency' => $currency,
                'converted_at' => Carbon::now()->subDay(),
            ]);
        }

        $usd = $this->item('marketing', 'attributed_revenue_usd');
        $bdt = $this->item('marketing', 'attributed_revenue_bdt');

        $this->assertSame(200.0, (float) $usd['value']);
        $this->assertSame('USD', $usd['currency']);
        $this->assertSame(30000.0, (float) $bdt['value']);
        $this->assertSame('BDT', $bdt['currency']);
    }

    public function test_churn_rate_is_cancellations_over_customers_at_the_start_of_the_period(): void
    {
        $plan = $this->plan('usd-pro', 'USD', 100);

        // Both subscriptions existed before the period, so both count in the
        // denominator; only one is cancelled inside it.
        $cancelled = $this->tenantOnPlan($plan, status: SubscriptionStatus::Cancelled);
        $cancelled->subscription->forceFill([
            'created_at' => Carbon::now()->subDays(60),
            'cancelled_at' => Carbon::now()->subDay(),
        ])->save();

        $retained = $this->tenantOnPlan($plan);
        $retained->subscription->forceFill(['created_at' => Carbon::now()->subDays(60)])->save();

        $churn = $this->item('subscription', 'churn_rate');

        $this->assertTrue($churn['available']);
        $this->assertSame(50.0, (float) $churn['value']);
        $this->assertSame(1, (int) $this->item('subscription', 'cancelled_subscriptions')['value']);
    }

    public function test_the_trend_is_bucketed_over_the_whole_period(): void
    {
        $trend = $this->overview->trend($this->period());

        $this->assertCount(30, $trend);
        $this->assertArrayHasKey('label', $trend[0]);
        $this->assertArrayHasKey('views', $trend[0]);
        $this->assertArrayHasKey('registrations', $trend[0]);
        $this->assertSame(0, $trend[0]['views']);
    }

    public function test_tracking_reports_what_is_actually_connected(): void
    {
        $tracking = $this->overview->tracking();

        $this->assertFalse($tracking['any_connected']);
        $this->assertSame([], $tracking['connected']);
        $this->assertContains('meta_conversions', $tracking['drivers_installed']);
        $this->assertContains('google_analytics', $tracking['drivers_installed']);
        $this->assertSame(0, $tracking['events_recorded']);
        $this->assertNotEmpty($tracking['not_configured']);
    }

    public function test_every_block_carries_a_label_and_a_stable_key(): void
    {
        $blocks = $this->overview->blocks($this->period());

        $this->assertCount(5, $blocks);

        foreach ($blocks as $block) {
            $this->assertNotEmpty($block['key']);
            $this->assertNotEmpty($block['label']);
            $this->assertNotEmpty($block['items']);

            foreach ($block['items'] as $item) {
                $this->assertArrayHasKey('available', $item);
                $this->assertArrayHasKey('format', $item);
                $this->assertArrayHasKey('label', $item);
            }
        }
    }

    public function test_the_definitions_are_published_alongside_the_numbers(): void
    {
        $methodology = $this->overview->methodology();

        $this->assertNotEmpty($methodology);
        $this->assertStringContainsString('never added together', implode(' ', $methodology));
    }
}
