<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\Enums\LeadStatus;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\Models\MarketingAttribution;
use App\Domain\Marketing\Models\MarketingCampaignSpend;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\PricingService;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;

/**
 * The Marketing Dashboard's figures.
 *
 * Every number here is computed from a real table. A metric whose source has no
 * data renders as an honest zero or an explicit "not available" with its reason —
 * never a substituted or illustrative value. Money is always grouped by currency
 * and never summed across currencies.
 */
class MarketingOverviewService
{
    public function __construct(
        protected MarketingIntegrationService $integrations,
        protected PricingService $pricing,
    ) {}

    /**
     * The dashboard's KPI blocks.
     *
     * @return list<array<string, mixed>>
     */
    public function blocks(PlatformPeriod $period): array
    {
        return [
            $this->websiteBlock($period),
            $this->leadBlock($period),
            $this->acquisitionBlock($period),
            $this->subscriptionBlock($period),
            $this->marketingBlock($period),
        ];
    }

    /**
     * Whether tracking is configured at all, so the dashboard can say plainly why
     * visitor metrics read zero.
     *
     * @return array<string, mixed>
     */
    public function tracking(): array
    {
        $summary = $this->integrations->summary();

        return [
            'any_connected' => $summary['any_connected'],
            'connected' => $summary['connected'],
            'not_configured' => $summary['not_configured'],
            'drivers_installed' => $summary['drivers_installed'],
            'visitors_recorded' => MarketingVisitor::query()->count(),
            'events_recorded' => MarketingEvent::query()->count(),
        ];
    }

    /**
     * Page views and registrations per bucket across the period.
     *
     * @return list<array{label: string, views: int, registrations: int}>
     */
    public function trend(PlatformPeriod $period): array
    {
        $monthly = $period->localFrom()->diffInDays($period->localTo()) > 92;

        $views = MarketingEvent::query()
            ->where('name', EventName::PageView->value)
            ->whereBetween('occurred_at', [$period->fromUtc, $period->toUtc])
            ->get(['occurred_at'])
            ->groupBy(fn ($event) => $this->bucketKey($event->occurred_at, $period, $monthly))
            ->map->count();

        $registrations = Tenant::query()
            ->whereBetween('created_at', [$period->fromUtc, $period->toUtc])
            ->get(['created_at'])
            ->groupBy(fn (Tenant $tenant) => $this->bucketKey($tenant->created_at, $period, $monthly))
            ->map->count();

        return collect($this->bucketKeys($period, $monthly))
            ->map(fn (string $key, string $label) => [
                'label' => $label,
                'views' => (int) ($views[$key] ?? 0),
                'registrations' => (int) ($registrations[$key] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * Monthly recurring revenue per currency, from active subscriptions only.
     * Yearly plans are normalised to a monthly figure.
     *
     * @return array<string, float>
     */
    public function mrrByCurrency(): array
    {
        $totals = [];

        $subscriptions = Subscription::withoutGlobalScopes()
            ->with(['plan', 'tenant'])
            ->where('status', SubscriptionStatus::Active->value)
            ->get();

        foreach ($subscriptions as $subscription) {
            if ($subscription->plan === null) {
                continue;
            }

            $price = $this->pricing->subscriptionPrice($subscription, $subscription->plan, $subscription->billing_cycle);
            $amount = (float) $price['amount'];

            if ($subscription->billing_cycle === BillingCycle::Yearly) {
                $amount /= 12;
            }

            $currency = $price['currency'];
            $totals[$currency] = ($totals[$currency] ?? 0) + $amount;
        }

        ksort($totals);

        return array_map(fn (float $value) => round($value, 2), $totals);
    }

    // -----------------------------------------------------------------------
    // Blocks
    // -----------------------------------------------------------------------

    /** @return array<string, mixed> */
    protected function websiteBlock(PlatformPeriod $period): array
    {
        $events = fn () => MarketingEvent::query()
            ->where('name', EventName::PageView->value)
            ->whereBetween('occurred_at', [$period->fromUtc, $period->toUtc]);

        return [
            'key' => 'website',
            'label' => 'Website performance',
            'items' => [
                $this->item('page_views', 'Page views', (int) $events()->count(), 'number'),
                $this->item('unique_visitors', 'Unique visitors', (int) $events()->whereNotNull('visitor_id')->distinct()->count('visitor_id'), 'number'),
                $this->item('new_visitors', 'New visitors', MarketingVisitor::query()->whereBetween('first_seen_at', [$period->fromUtc, $period->toUtc])->where('is_bot', false)->count(), 'number'),
                $this->item('returning_visitors', 'Returning visitors', MarketingVisitor::query()
                    ->whereBetween('last_seen_at', [$period->fromUtc, $period->toUtc])
                    ->where('first_seen_at', '<', $period->fromUtc)
                    ->where('is_bot', false)
                    ->count(), 'number'),
                $this->item('landing_page_views', 'Landing page views', (int) $events()->whereNotNull('landing_page_id')->count(), 'number'),
                $this->item('organic_visitors', 'Organic visitors', MarketingVisitor::query()
                    ->whereBetween('last_seen_at', [$period->fromUtc, $period->toUtc])
                    ->where('channel', MarketingChannel::Organic->value)
                    ->where('is_bot', false)
                    ->count(), 'number'),
            ],
        ];
    }

    /** @return array<string, mixed> */
    protected function leadBlock(PlatformPeriod $period): array
    {
        $leads = fn () => MarketingLead::query()->whereBetween('created_at', [$period->fromUtc, $period->toUtc]);

        $total = (int) $leads()->count();
        $converted = (int) $leads()->whereNotNull('converted_at')->count();

        return [
            'key' => 'leads',
            'label' => 'Lead generation',
            'items' => [
                $this->item('total_leads', 'Total leads', $total, 'number'),
                $this->item('new_leads', 'New leads', (int) $leads()->where('status', LeadStatus::New->value)->count(), 'number'),
                $this->item('qualified_leads', 'Qualified leads', (int) $leads()->whereIn('status', [
                    LeadStatus::Qualified->value,
                    LeadStatus::DemoScheduled->value,
                    LeadStatus::DemoCompleted->value,
                    LeadStatus::TrialStarted->value,
                    LeadStatus::ProposalSent->value,
                    LeadStatus::Converted->value,
                ])->count(), 'number'),
                $this->item('demo_requests', 'Demo requests', (int) $leads()->where('source', LeadSource::DemoForm->value)->count(), 'number'),
                $this->item('contact_submissions', 'Contact submissions', (int) $leads()->where('source', LeadSource::ContactForm->value)->count(), 'number'),
                $this->item('lead_conversion_rate', 'Lead conversion rate', $total > 0 ? round($converted / $total * 100, 1) : 0.0, 'percent'),
            ],
        ];
    }

    /** @return array<string, mixed> */
    protected function acquisitionBlock(PlatformPeriod $period): array
    {
        $subscriptions = fn () => Subscription::withoutGlobalScopes();

        $activeTrials = (int) $subscriptions()->where('status', SubscriptionStatus::Trialing->value)->count();

        $expiredTrials = (int) $subscriptions()
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', Carbon::now())
            ->whereIn('status', [
                SubscriptionStatus::Expired->value,
                SubscriptionStatus::Suspended->value,
                SubscriptionStatus::Cancelled->value,
            ])
            ->count();

        return [
            'key' => 'acquisition',
            'label' => 'Restaurant acquisition',
            'items' => [
                $this->item('total_restaurants', 'Registered restaurants', Tenant::query()->count(), 'number'),
                $this->item('new_restaurants', 'New registrations', Tenant::query()->whereBetween('created_at', [$period->fromUtc, $period->toUtc])->count(), 'number'),
                $this->item('active_trials', 'Active trials', $activeTrials, 'number'),
                $this->item('expired_trials', 'Trials ended without conversion', $expiredTrials, 'number'),
                $this->item('active_paid', 'Active paid restaurants', (int) $subscriptions()->where('status', SubscriptionStatus::Active->value)->count(), 'number'),
                $this->item('inactive_restaurants', 'Inactive restaurants', Tenant::query()->where('status', '!=', TenantStatus::Active->value)->count(), 'number'),
            ],
        ];
    }

    /** @return array<string, mixed> */
    protected function subscriptionBlock(PlatformPeriod $period): array
    {
        $subscriptions = fn () => Subscription::withoutGlobalScopes();

        $activeAtStart = (int) $subscriptions()
            ->where('created_at', '<', $period->fromUtc)
            ->where(fn ($query) => $query->whereNull('cancelled_at')->orWhere('cancelled_at', '>=', $period->fromUtc))
            ->count();

        $churned = (int) $subscriptions()
            ->whereBetween('cancelled_at', [$period->fromUtc, $period->toUtc])
            ->count();

        $items = [
            $this->item('active_subscriptions', 'Active subscriptions', (int) $subscriptions()->where('status', SubscriptionStatus::Active->value)->count(), 'number'),
            $this->item('new_subscriptions', 'New subscriptions', (int) $subscriptions()->whereBetween('created_at', [$period->fromUtc, $period->toUtc])->count(), 'number'),
            $this->item('cancelled_subscriptions', 'Cancelled subscriptions', $churned, 'number'),
            $this->item('churn_rate', 'Customer churn rate', $activeAtStart > 0 ? round($churned / $activeAtStart * 100, 1) : 0.0, 'percent'),
        ];

        $mrr = $this->mrrByCurrency();
        $activeCount = (int) $subscriptions()->where('status', SubscriptionStatus::Active->value)->count();

        if ($mrr === []) {
            $items[] = $this->unavailable('mrr', 'MRR', 'No active subscription has a price recorded yet.');
        } else {
            foreach ($mrr as $currency => $amount) {
                $items[] = $this->money('mrr_'.strtolower($currency), 'MRR ('.$currency.')', $amount, $currency, 'Active subscriptions, monthly-normalised.');
                $items[] = $this->money('arr_'.strtolower($currency), 'ARR ('.$currency.')', round($amount * 12, 2), $currency, 'MRR × 12 run rate.');
                $items[] = $this->money('arpa_'.strtolower($currency), 'ARPA ('.$currency.')', $activeCount > 0 ? round($amount / $activeCount, 2) : 0.0, $currency, 'Per active subscription.');
            }
        }

        return [
            'key' => 'subscription',
            'label' => 'Subscription performance',
            'items' => $items,
        ];
    }

    /** @return array<string, mixed> */
    protected function marketingBlock(PlatformPeriod $period): array
    {
        $spendByCurrency = MarketingCampaignSpend::query()
            ->whereBetween('period_start', [$period->localFrom()->toDateString(), $period->localTo()->toDateString()])
            ->get(['amount', 'currency', 'source'])
            ->groupBy('currency')
            ->map(fn ($rows) => round((float) $rows->sum('amount'), 2))
            ->all();

        $revenueByCurrency = MarketingAttribution::query()
            ->whereBetween('converted_at', [$period->fromUtc, $period->toUtc])
            ->get(['value', 'currency'])
            ->filter(fn ($row) => $row->currency !== null)
            ->groupBy('currency')
            ->map(fn ($rows) => round((float) $rows->sum('value'), 2))
            ->all();

        $newPaying = (int) Subscription::withoutGlobalScopes()
            ->whereBetween('current_period_start', [$period->fromUtc, $period->toUtc])
            ->whereIn('status', [
                SubscriptionStatus::Active->value,
                SubscriptionStatus::PastDue->value,
                SubscriptionStatus::GracePeriod->value,
            ])
            ->count();

        $manualOnly = MarketingCampaignSpend::query()->where('source', 'manual')->exists();

        $items = [];

        if ($spendByCurrency === []) {
            $items[] = $this->unavailable('spend', 'Marketing spend', 'No campaign spend has been recorded for this period.');
        } else {
            foreach ($spendByCurrency as $currency => $amount) {
                $hint = $manualOnly ? 'Includes manually entered spend.' : 'From a connected ad platform.';
                $items[] = $this->money('spend_'.strtolower((string) $currency), 'Marketing spend ('.$currency.')', $amount, (string) $currency, $hint);

                if ($newPaying > 0) {
                    $items[] = $this->money('cac_'.strtolower((string) $currency), 'CAC ('.$currency.')', round($amount / $newPaying, 2), (string) $currency, 'Spend ÷ new paying restaurants.');
                } else {
                    $items[] = $this->unavailable('cac_'.strtolower((string) $currency), 'CAC ('.$currency.')', 'No new paying restaurant in this period, so CAC cannot be calculated.');
                }
            }
        }

        if ($revenueByCurrency === []) {
            $items[] = $this->unavailable('attributed_revenue', 'Marketing-attributed revenue', 'No conversions have been attributed yet.');
        } else {
            foreach ($revenueByCurrency as $currency => $revenue) {
                $items[] = $this->money('attributed_revenue_'.strtolower((string) $currency), 'Attributed revenue ('.$currency.')', $revenue, (string) $currency, 'Attributed by the configured model.');
            }
        }

        // ROAS is only meaningful per currency: a spend in one currency and revenue
        // in another can never produce a single ratio, so each side is reported on
        // its own terms instead of being converted or merged.
        $roasCurrencies = array_unique(array_merge(array_keys($spendByCurrency), array_keys($revenueByCurrency)));

        foreach ($roasCurrencies as $currency) {
            $spend = $spendByCurrency[$currency] ?? null;
            $revenue = $revenueByCurrency[$currency] ?? null;

            $items[] = match (true) {
                $spend === null || $spend <= 0 => $this->unavailable(
                    'roas_'.$currency,
                    'ROAS ('.$currency.')',
                    'No spend recorded in this currency, so ROAS is undefined.',
                ),
                $revenue === null => $this->unavailable(
                    'roas_'.$currency,
                    'ROAS ('.$currency.')',
                    'No attributed revenue in this currency yet.',
                ),
                default => $this->item(
                    'roas_'.$currency,
                    'ROAS ('.$currency.')',
                    round($revenue / $spend, 2).'×',
                    'text',
                    hint: 'Attributed revenue ÷ recorded spend.',
                ),
            };
        }

        $totalLeads = (int) MarketingLead::query()->whereBetween('created_at', [$period->fromUtc, $period->toUtc])->count();
        $convertedLeads = (int) MarketingLead::query()->whereBetween('created_at', [$period->fromUtc, $period->toUtc])->whereNotNull('converted_at')->count();

        $items[] = $this->item('lead_to_customer', 'Lead → customer rate', $totalLeads > 0 ? round($convertedLeads / $totalLeads * 100, 1) : 0.0, 'percent');

        $trialed = (int) Subscription::withoutGlobalScopes()
            ->whereNotNull('trial_ends_at')
            ->where('status', '!=', SubscriptionStatus::Trialing->value)
            ->count();

        $convertedFromTrial = (int) Subscription::withoutGlobalScopes()
            ->whereNotNull('trial_ends_at')
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->count();

        $items[] = $trialed > 0
            ? $this->item('trial_conversion', 'Trial → paid rate', round($convertedFromTrial / $trialed * 100, 1), 'percent', hint: 'Converted ÷ subscriptions that ever trialed.')
            : $this->unavailable('trial_conversion', 'Trial → paid rate', 'No subscription has finished a trial yet.');

        return [
            'key' => 'marketing',
            'label' => 'Marketing performance',
            'items' => $items,
        ];
    }

    /**
     * Plain-language definitions shown alongside the figures, so a number is never
     * left open to interpretation.
     *
     * @return list<string>
     */
    public function methodology(): array
    {
        return [
            'Website figures come from this platform\'s own first-party tracking. They will differ from Google Analytics and Search Console, which measure the same site their own way — each figure is labelled with the system that produced it.',
            'Marketing-attributed revenue counts only conversions attributed to a marketing touchpoint by the configured model and window. It is always shown separately from total subscription revenue.',
            'MRR counts active subscriptions only, normalised to a monthly figure (annual plans ÷ 12), and is grouped by currency — amounts in different currencies are never added together.',
            'Customer churn rate is subscriptions cancelled during the period ÷ subscriptions active at the start of the period.',
            'CAC is recorded acquisition spend ÷ restaurants that became paying customers in the period. It is correlational, not causal.',
            'Trial conversion is converted subscriptions ÷ subscriptions that have finished a trial (still-trialing subscriptions are excluded).',
            'A manually entered spend figure is labelled as such; it is never presented as live data from an advertising platform.',
        ];
    }

    // -----------------------------------------------------------------------
    // Item helpers
    // -----------------------------------------------------------------------

    /** @return array<string, mixed> */
    protected function item(string $key, string $label, mixed $value, string $format, ?string $currency = null, ?string $hint = null): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'value' => $value,
            'format' => $format,
            'currency' => $currency,
            'hint' => $hint,
            'available' => true,
        ];
    }

    /** @return array<string, mixed> */
    protected function money(string $key, string $label, float $value, string $currency, ?string $hint = null): array
    {
        return $this->item($key, $label, $value, 'money', $currency, $hint);
    }

    /** @return array<string, mixed> */
    protected function unavailable(string $key, string $label, string $reason): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'value' => null,
            'format' => 'text',
            'currency' => null,
            'hint' => null,
            'available' => false,
            'reason' => $reason,
        ];
    }

    // -----------------------------------------------------------------------
    // Bucketing
    // -----------------------------------------------------------------------

    protected function bucketKey(?Carbon $at, PlatformPeriod $period, bool $monthly): string
    {
        if ($at === null) {
            return '';
        }

        $local = $at->copy()->setTimezone($period->timezone);

        return $monthly ? $local->format('Y-m') : $local->format('Y-m-d');
    }

    /** @return array<string, string> key => label */
    protected function bucketKeys(PlatformPeriod $period, bool $monthly): array
    {
        $keys = [];
        $cursor = $period->localFrom()->copy();

        if ($monthly) {
            $cursor = $cursor->startOfMonth();
            $end = $period->localTo()->copy()->startOfMonth();
        } else {
            $cursor = $cursor->startOfDay();
            $end = $period->localTo()->copy()->startOfDay();
        }

        $guard = 0;

        while ($cursor->lessThanOrEqualTo($end) && $guard < 400) {
            $keys[$monthly ? $cursor->format('Y-m') : $cursor->format('Y-m-d')] = $monthly
                ? $cursor->format('M Y')
                : $cursor->format('d M');

            $monthly ? $cursor->addMonthNoOverflow() : $cursor->addDay();
            $guard++;
        }

        return $keys;
    }
}
