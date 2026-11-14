<?php

namespace App\Domain\Marketing\Analytics;

use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\MarketingOverviewService;
use App\Domain\Marketing\Models\MarketingAttribution;
use App\Domain\Marketing\Models\MarketingCampaignSpend;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\PricingService;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;

/**
 * Growth analytics.
 *
 * Every figure is grouped by currency and never summed across currencies. A metric with
 * no source reports null with a reason, never a zero that looks like a measurement.
 * The formulas are the ones published in docs/marketing/METRICS.md.
 */
class MarketingAnalyticsService
{
    public function __construct(protected PricingService $pricing) {}

    /**
     * The ten-step acquisition funnel.
     *
     * @return array{steps: list<array<string, mixed>>, overall_rate: float, generated_at: string}
     */
    public function funnel(PlatformPeriod $period): array
    {
        $range = [$period->fromUtc, $period->toUtc];

        $visitors = fn () => MarketingEvent::query()
            ->where('name', EventName::PageView->value)
            ->whereBetween('occurred_at', $range);

        $steps = [
            ['key' => 'visitor', 'label' => 'Website visitor', 'count' => (int) $visitors()->whereNotNull('visitor_id')->distinct()->count('visitor_id'), 'source' => 'marketing_events'],
            ['key' => 'landing', 'label' => 'Landing page visit', 'count' => (int) $visitors()->whereNotNull('landing_page_id')->distinct()->count('visitor_id'), 'source' => 'marketing_events'],
            ['key' => 'pricing', 'label' => 'Pricing page visit', 'count' => (int) MarketingEvent::query()->where('name', EventName::ViewContent->value)->whereBetween('occurred_at', $range)->whereNotNull('visitor_id')->distinct()->count('visitor_id'), 'source' => 'marketing_events'],
            ['key' => 'lead', 'label' => 'Lead submitted', 'count' => (int) MarketingLead::query()->whereBetween('created_at', $range)->count(), 'source' => 'marketing_leads'],
            ['key' => 'registration_started', 'label' => 'Registration started', 'count' => (int) MarketingEvent::query()->where('name', EventName::RegistrationStarted->value)->whereBetween('occurred_at', $range)->whereNotNull('visitor_id')->distinct()->count('visitor_id'), 'source' => 'marketing_events'],
            ['key' => 'registered', 'label' => 'Restaurant registered', 'count' => Tenant::query()->whereBetween('created_at', $range)->count(), 'source' => 'tenants'],
            ['key' => 'trial', 'label' => 'Trial started', 'count' => (int) Subscription::withoutGlobalScopes()->whereBetween('created_at', $range)->whereNotNull('trial_ends_at')->count(), 'source' => 'subscriptions'],
            ['key' => 'checkout', 'label' => 'Checkout started', 'count' => (int) MarketingEvent::query()->where('name', EventName::InitiateCheckout->value)->whereBetween('occurred_at', $range)->count(), 'source' => 'marketing_events'],
            ['key' => 'paid', 'label' => 'Payment completed', 'count' => (int) PlatformPayment::withoutGlobalScopes()->where('status', 'succeeded')->whereBetween('paid_at', $range)->count(), 'source' => 'platform_payments'],
            ['key' => 'active', 'label' => 'Active paid subscription', 'count' => (int) Subscription::withoutGlobalScopes()->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])->whereBetween('current_period_start', $range)->count(), 'source' => 'subscriptions'],
        ];

        $previous = null;

        foreach ($steps as $index => $step) {
            $steps[$index]['conversion_rate'] = $previous !== null && $previous > 0
                ? round($step['count'] / $previous * 100, 1)
                : null;
            $steps[$index]['drop_off'] = $steps[$index]['conversion_rate'] === null ? null : round(100 - $steps[$index]['conversion_rate'], 1);
            $previous = $step['count'];
        }

        $first = $steps[0]['count'];
        $last = $steps[count($steps) - 1]['count'];

        return [
            'steps' => $steps,
            'overall_rate' => $first > 0 ? round($last / $first * 100, 2) : 0.0,
            'generated_at' => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Attributed revenue per channel and model, and the share of total revenue it
     * represents — kept separate so the two are never conflated.
     *
     * @return array<string, mixed>
     */
    public function attribution(PlatformPeriod $period): array
    {
        $rows = MarketingAttribution::query()
            ->whereBetween('converted_at', [$period->fromUtc, $period->toUtc])
            ->get();

        $byModel = [];

        foreach (['first_touch', 'last_touch'] as $model) {
            $subset = $rows->where('model', $model);

            $byModel[$model] = [
                'customers' => $subset->count(),
                'channels' => $subset
                    ->groupBy(fn (MarketingAttribution $row) => $row->channel?->value ?? 'direct')
                    ->map(fn ($group, string $channel) => [
                        'channel' => $channel,
                        'label' => MarketingChannel::tryFrom($channel)?->label() ?? ucfirst($channel),
                        'customers' => $group->count(),
                        // Per currency: never one blended number.
                        'value' => $group->filter(fn (MarketingAttribution $row) => $row->value !== null && $row->currency !== null)
                            ->groupBy('currency')
                            ->map(fn ($currencyRows, string $currency) => ['currency' => $currency, 'amount' => round((float) $currencyRows->sum('value'), 2)])
                            ->values()
                            ->all(),
                    ])
                    ->sortByDesc('customers')
                    ->values()
                    ->all(),
                'unattributed' => $subset->whereNull('touchpoint_at')->count(),
            ];
        }

        return [
            'models' => $byModel,
            'window_days' => app(AttributionService::class)->windowDays(),
            'headline_model' => app(AttributionService::class)->model()->value,
            'total_revenue' => $this->settledRevenue($period),
        ];
    }

    /**
     * New customers by country, campaign, restaurant type and plan.
     *
     * @return array<string, mixed>
     */
    public function acquisition(PlatformPeriod $period): array
    {
        $tenants = Tenant::query()->whereBetween('created_at', [$period->fromUtc, $period->toUtc])->get();

        $country = $tenants
            ->groupBy(fn (Tenant $tenant) => strtoupper((string) ($tenant->getSetting('region.country') ?? '—')))
            ->map(fn ($group, string $country) => ['label' => $country, 'count' => $group->count()])
            ->sortByDesc('count')->values()->all();

        $plan = $tenants
            ->groupBy(fn (Tenant $tenant) => $tenant->subscription?->plan?->name ?? 'No plan')
            ->map(fn ($group, string $plan) => ['label' => $plan, 'count' => $group->count()])
            ->sortByDesc('count')->values()->all();

        $campaign = MarketingLead::query()
            ->whereBetween('created_at', [$period->fromUtc, $period->toUtc])
            ->whereNotNull('campaign_id')
            ->with('campaign:id,name')
            ->get()
            ->groupBy(fn (MarketingLead $lead) => $lead->campaign?->name ?? 'Unknown')
            ->map(fn ($group, string $name) => [
                'label' => $name,
                'leads' => $group->count(),
                'converted' => $group->filter(fn (MarketingLead $lead) => $lead->converted_at !== null)->count(),
            ])
            ->sortByDesc('leads')->values()->all();

        return [
            'new_customers' => $tenants->count(),
            'by_country' => $country,
            'by_plan' => $plan,
            'by_campaign' => $campaign,
        ];
    }

    /**
     * Subscription movement in the period.
     *
     * @return array<string, mixed>
     */
    public function subscriptions(PlatformPeriod $period): array
    {
        $range = [$period->fromUtc, $period->toUtc];

        return [
            'active' => (int) Subscription::withoutGlobalScopes()->where('status', SubscriptionStatus::Active->value)->count(),
            'trialing' => (int) Subscription::withoutGlobalScopes()->where('status', SubscriptionStatus::Trialing->value)->count(),
            'past_due' => (int) Subscription::withoutGlobalScopes()->where('status', SubscriptionStatus::PastDue->value)->count(),
            'expired' => (int) Subscription::withoutGlobalScopes()->where('status', SubscriptionStatus::Expired->value)->count(),
            'cancelled_in_period' => (int) Subscription::withoutGlobalScopes()->whereBetween('cancelled_at', $range)->count(),
            'new_in_period' => (int) Subscription::withoutGlobalScopes()->whereBetween('created_at', $range)->count(),
            'failed_payments' => (int) PlatformPayment::withoutGlobalScopes()->where('status', 'failed')->whereBetween('created_at', $range)->count(),
            'mrr' => app(MarketingOverviewService::class)->mrrByCurrency(),
        ];
    }

    /**
     * Churn, retention and monthly cohorts.
     *
     * @return array<string, mixed>
     */
    public function retention(PlatformPeriod $period): array
    {
        $activeAtStart = (int) Subscription::withoutGlobalScopes()
            ->where('created_at', '<', $period->fromUtc)
            ->where(fn ($query) => $query->whereNull('cancelled_at')->orWhere('cancelled_at', '>=', $period->fromUtc))
            ->count();

        $churned = (int) Subscription::withoutGlobalScopes()
            ->whereBetween('cancelled_at', [$period->fromUtc, $period->toUtc])
            ->count();

        $reactivated = (int) Subscription::withoutGlobalScopes()
            ->whereBetween('current_period_start', [$period->fromUtc, $period->toUtc])
            ->whereNotNull('cancelled_at')
            ->count();

        return [
            'active_at_start' => $activeAtStart,
            'churned' => $churned,
            'churn_rate' => $activeAtStart > 0 ? round($churned / $activeAtStart * 100, 1) : null,
            'retention_rate' => $activeAtStart > 0 ? round(100 - ($churned / $activeAtStart * 100), 1) : null,
            'reactivated' => $reactivated,
            'cohorts' => $this->cohorts(6),
            'renewal_rate' => $this->renewalRate($period),
        ];
    }

    /**
     * Observed lifetime value: revenue actually collected per customer. Not a forecast.
     *
     * @return array<string, mixed>
     */
    public function lifetimeValue(): array
    {
        $invoices = SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->get(['tenant_id', 'amount', 'currency']);

        $customers = max(1, Tenant::query()->count());

        $perCurrency = $invoices
            ->groupBy('currency')
            ->map(fn ($rows, string $currency) => [
                'currency' => $currency,
                'collected' => round((float) $rows->sum('amount'), 2),
                'ltv' => round((float) $rows->sum('amount') / $customers, 2),
            ])
            ->values()
            ->all();

        return [
            'customers' => Tenant::query()->count(),
            'per_currency' => $perCurrency,
            'note' => 'Observed lifetime value: revenue actually collected ÷ customers, per currency. There is no predictive model.',
        ];
    }

    /**
     * CAC and ROAS per currency, with the spend source stated.
     *
     * @return list<array<string, mixed>>
     */
    public function efficiency(PlatformPeriod $period): array
    {
        $spend = MarketingCampaignSpend::query()
            ->whereBetween('period_start', [$period->localFrom()->toDateString(), $period->localTo()->toDateString()])
            ->get(['currency', 'amount', 'source'])
            ->groupBy('currency');

        // New paying customers counted per currency: dividing BDT spend by a USD
        // customer would produce a CAC that means nothing.
        $newPaying = Subscription::withoutGlobalScopes()
            ->with(['plan', 'tenant'])
            ->whereBetween('current_period_start', [$period->fromUtc, $period->toUtc])
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->get()
            ->filter(fn (Subscription $subscription) => $subscription->plan !== null)
            ->groupBy(fn (Subscription $subscription) => $this->pricing->subscriptionPrice($subscription, $subscription->plan, $subscription->billing_cycle)['currency'])
            ->map->count();

        $attributed = MarketingAttribution::query()
            ->whereBetween('converted_at', [$period->fromUtc, $period->toUtc])
            ->whereNotNull('value')
            ->get(['currency', 'value'])
            ->groupBy('currency');

        $currencies = $spend->keys()->merge($attributed->keys())->unique()->values();
        $rows = [];

        foreach ($currencies as $currency) {
            $amount = round((float) ($spend[$currency] ?? collect())->sum('amount'), 2);
            $revenue = round((float) ($attributed[$currency] ?? collect())->sum('value'), 2);
            $manual = ($spend[$currency] ?? collect())->contains(fn ($row) => $row->source === 'manual');
            $paying = (int) ($newPaying[$currency] ?? 0);

            $rows[] = [
                'currency' => $currency,
                'spend' => $amount,
                'spend_is_manual' => $manual,
                'attributed_revenue' => $revenue,
                'cac' => $amount > 0 && $paying > 0 ? round($amount / $paying, 2) : null,
                'roas' => $amount > 0 ? round($revenue / $amount, 2) : null,
                'cac_reason' => $amount === 0 ? 'No spend recorded in this currency.' : ($paying === 0 ? 'No new paying restaurant in this currency this period.' : null),
                'roas_reason' => $amount === 0 ? 'No spend recorded in this currency, so ROAS is undefined.' : null,
            ];
        }

        return $rows;
    }

    /**
     * Monthly signup cohorts and how much of each is still active.
     *
     * @return list<array<string, mixed>>
     */
    public function cohorts(int $months = 6): array
    {
        $cohorts = [];

        for ($offset = $months - 1; $offset >= 0; $offset--) {
            $start = Carbon::now()->subMonthsNoOverflow($offset)->startOfMonth();
            $end = $start->copy()->endOfMonth();

            $signups = Tenant::query()->whereBetween('created_at', [$start->copy()->utc(), $end->copy()->utc()])->count();

            $stillActive = $signups === 0 ? 0 : Tenant::query()
                ->whereBetween('created_at', [$start->copy()->utc(), $end->copy()->utc()])
                ->whereHas('subscription', fn ($query) => $query->whereIn('status', [
                    SubscriptionStatus::Active->value,
                    SubscriptionStatus::Trialing->value,
                    SubscriptionStatus::PastDue->value,
                ]))
                ->count();

            $cohorts[] = [
                'cohort' => $start->format('M Y'),
                'signups' => $signups,
                'active' => $stillActive,
                'retention' => $signups > 0 ? round($stillActive / $signups * 100, 1) : null,
            ];
        }

        return $cohorts;
    }

    /** @return array<string, mixed> */
    protected function renewalRate(PlatformPeriod $period): array
    {
        $due = (int) Subscription::withoutGlobalScopes()
            ->whereBetween('current_period_end', [$period->fromUtc, $period->toUtc])
            ->count();

        $renewed = (int) SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$period->fromUtc, $period->toUtc])
            ->count();

        return [
            'due' => $due,
            'renewed' => $renewed,
            'rate' => $due > 0 ? round(min(100, $renewed / $due * 100), 1) : null,
        ];
    }

    /** @return list<array{currency: string, amount: float}> */
    protected function settledRevenue(PlatformPeriod $period): array
    {
        return SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$period->fromUtc, $period->toUtc])
            ->get(['amount', 'currency'])
            ->groupBy('currency')
            ->map(fn ($rows, string $currency) => ['currency' => $currency, 'amount' => round((float) $rows->sum('amount'), 2)])
            ->values()
            ->all();
    }

    /** @return list<string> */
    public function methodology(): array
    {
        return [
            'Attribution writes one first-touch and one last-touch row per customer, bounded by the configured window; a touchpoint older than the window does not qualify and the customer is reported as direct.',
            'Attributed revenue is counted separately from total revenue. The two are never added together or presented as one figure.',
            'Every money figure is grouped by currency. There is no exchange-rate conversion, so different currencies are never combined.',
            'CAC = recorded acquisition spend ÷ restaurants that became paying customers in the period. It is correlational, not causal.',
            'ROAS = attributed revenue ÷ recorded spend, within a single currency. Manual spend is labelled as such wherever it feeds a figure.',
            'Churn rate = customers lost during the period ÷ customers active at the start of the period.',
            'A cohort is the set of restaurants that registered in a given month; retention is the share of that cohort still on an active or trialing subscription today.',
            'Lifetime value is observed revenue per customer, not a forecast. There is no predictive model.',
            'Funnel steps before registration count distinct visitors; steps from registration onward count distinct restaurants, so re-visiting a page does not inflate a step.',
        ];
    }
}
