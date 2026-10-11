<?php

namespace App\Domain\PlatformAnalytics;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;

/**
 * Platform-level analytics for the control center.
 *
 * Definitions (surfaced to the operator in the UI):
 *  - MRR  = Σ monthly-normalised price of ACTIVE subscriptions (yearly ÷ 12).
 *           Trialing, past-due, suspended, cancelled and unpaid are excluded.
 *  - ARR  = MRR × 12.
 *  - Collected = SUM of PAID subscription invoices by paid date within the period.
 *  - Outstanding = SUM of OPEN subscription invoices (all-time).
 *  - Churn = cancelled in period ÷ subscriptions active at period start.
 *  - Trial conversion (approx.) = converted ÷ ever-trialed (excludes those still trialing).
 *
 * All monetary figures are reported in a single platform currency; multi-currency
 * conversion arrives with the billing phases.
 */
class PlatformAnalyticsService
{
    public function currency(): string
    {
        return app(\App\Domain\PlatformSettings\PlatformSettings::class)->reportingCurrency();
    }

    /** @return list<string> */
    public function methodology(): array
    {
        return [
            'MRR counts active subscriptions only, normalised to a monthly figure (annual plans ÷ 12). Trialing, past-due, suspended, cancelled and unpaid subscriptions are excluded.',
            'ARR is MRR × 12. It is a forward-looking run rate, not recognised revenue.',
            'Collected revenue is the sum of paid subscription invoices by payment date within the selected period.',
            'Outstanding is the sum of all open subscription invoices and is not limited to the period.',
            'Churn is cancelled subscriptions in the period ÷ subscriptions active at the start of the period.',
            'Trial conversion is approximate: converted ÷ subscriptions that ever trialed (still-trialing subscriptions are excluded).',
        ];
    }

    /** @return list<array<string, mixed>> */
    public function kpis(PlatformPeriod $period): array
    {
        $currency = $this->currency();
        $now = Carbon::now($period->timezone);
        $monthStart = $now->copy()->startOfMonth()->utc();
        $monthEnd = $now->copy()->endOfMonth()->utc();

        $subscriptions = Subscription::withoutGlobalScopes()->with('plan')->get();

        $mrr = round(
            $subscriptions
                ->filter(fn (Subscription $s) => $s->status === SubscriptionStatus::Active)
                ->sum(fn (Subscription $s) => $this->normalizedMonthly($s)),
            2,
        );

        $collected = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$monthStart, $monthEnd])
            ->sum('amount');

        $paidInvoices = SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$monthStart, $monthEnd])
            ->count();

        $outstanding = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', 'open')
            ->sum('amount');

        $activeAtStart = Subscription::withoutGlobalScopes()
            ->where('created_at', '<', $period->fromUtc)
            ->where(fn ($q) => $q->whereNull('cancelled_at')->orWhere('cancelled_at', '>=', $period->fromUtc))
            ->count();

        $churned = Subscription::withoutGlobalScopes()
            ->whereBetween('cancelled_at', [$period->fromUtc, $period->toUtc])
            ->count();

        $everTrialed = Subscription::withoutGlobalScopes()
            ->whereNotNull('trial_ends_at')
            ->where('status', '!=', SubscriptionStatus::Trialing->value)
            ->count();

        $converted = Subscription::withoutGlobalScopes()
            ->whereNotNull('trial_ends_at')
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->count();

        $trialConversion = $everTrialed > 0 ? round($converted / $everTrialed * 100, 1) : null;

        return [
            ['key' => 'total_tenants', 'label' => 'Total tenants', 'value' => Tenant::query()->count(), 'format' => 'number', 'hint' => 'All accounts'],
            ['key' => 'active_tenants', 'label' => 'Active tenants', 'value' => Tenant::query()->where('status', 'active')->count(), 'format' => 'number', 'hint' => 'Status = active'],
            ['key' => 'new_tenants', 'label' => 'New tenants', 'value' => Tenant::query()->whereBetween('created_at', [$monthStart, $monthEnd])->count(), 'format' => 'number', 'hint' => 'Registered this month'],
            ['key' => 'on_trial', 'label' => 'On trial', 'value' => $subscriptions->where('status', SubscriptionStatus::Trialing)->count(), 'format' => 'number', 'hint' => 'Subscriptions trialing'],
            ['key' => 'active_subscriptions', 'label' => 'Active subscriptions', 'value' => $subscriptions->where('status', SubscriptionStatus::Active)->count(), 'format' => 'number', 'hint' => 'Paying accounts'],
            ['key' => 'past_due', 'label' => 'Past due', 'value' => $subscriptions->where('status', SubscriptionStatus::PastDue)->count(), 'format' => 'number', 'tone' => 'warning', 'hint' => 'Payment overdue'],
            ['key' => 'suspended', 'label' => 'Suspended', 'value' => Tenant::query()->where('status', 'suspended')->count(), 'format' => 'number', 'tone' => 'danger', 'hint' => 'Accounts suspended'],
            ['key' => 'mrr', 'label' => 'MRR', 'value' => $mrr, 'format' => 'money', 'currency' => $currency, 'hint' => 'Active subscriptions, monthly-normalised'],
            ['key' => 'arr', 'label' => 'ARR', 'value' => round($mrr * 12, 2), 'format' => 'money', 'currency' => $currency, 'hint' => 'MRR × 12 run rate'],
            ['key' => 'collected', 'label' => 'Collected', 'value' => round($collected, 2), 'format' => 'money', 'currency' => $currency, 'tone' => 'success', 'hint' => 'Paid invoices this month'],
            ['key' => 'outstanding', 'label' => 'Outstanding', 'value' => round($outstanding, 2), 'format' => 'money', 'currency' => $currency, 'tone' => $outstanding > 0 ? 'warning' : 'neutral', 'hint' => 'Open invoices (all-time)'],
            ['key' => 'paid_invoices', 'label' => 'Invoices paid', 'value' => $paidInvoices, 'format' => 'number', 'hint' => 'This month'],
            ['key' => 'churn', 'label' => 'Churn', 'value' => $activeAtStart > 0 ? round($churned / $activeAtStart * 100, 1) : 0.0, 'format' => 'percent', 'hint' => 'Cancelled ÷ active at period start'],
            ['key' => 'trial_conversion', 'label' => 'Trial conversion', 'value' => $trialConversion, 'format' => 'percent', 'hint' => 'Approximate — converts ÷ ever-trialed'],
            ['key' => 'failed_payments', 'label' => 'Failed payments', 'value' => null, 'format' => 'money', 'currency' => $currency, 'available' => false, 'reason' => 'Enabled with SSLCommerz payments (Phase 5)'],
            ['key' => 'refunds', 'label' => 'Refunds', 'value' => null, 'format' => 'money', 'currency' => $currency, 'available' => false, 'reason' => 'Enabled with the payments module (Phase 5)'],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function revenueTrend(PlatformPeriod $period): array
    {
        $grouped = [];
        foreach (
            SubscriptionInvoice::withoutGlobalScopes()
                ->where('status', 'paid')
                ->whereBetween('paid_at', [$period->fromUtc, $period->toUtc])
                ->get(['paid_at', 'amount']) as $invoice
        ) {
            if (! $invoice->paid_at) {
                continue;
            }
            $key = $period->monthKey($invoice->paid_at);
            $grouped[$key] = ($grouped[$key] ?? 0) + (float) $invoice->amount;
        }

        return collect($period->monthKeys())
            ->map(fn (string $key) => ['month' => PlatformPeriod::monthLabel($key), 'collected' => round($grouped[$key] ?? 0, 2)])
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public function subscriptionMovement(PlatformPeriod $period): array
    {
        $new = Subscription::withoutGlobalScopes()
            ->whereBetween('created_at', [$period->fromUtc, $period->toUtc])
            ->pluck('created_at')
            ->groupBy(fn (Carbon $at) => $period->monthKey($at))
            ->map->count();

        $cancelled = Subscription::withoutGlobalScopes()
            ->whereBetween('cancelled_at', [$period->fromUtc, $period->toUtc])
            ->pluck('cancelled_at')
            ->groupBy(fn (Carbon $at) => $period->monthKey($at))
            ->map->count();

        return collect($period->monthKeys())
            ->map(fn (string $key) => [
                'month' => PlatformPeriod::monthLabel($key),
                'new' => (int) ($new[$key] ?? 0),
                'cancelled' => (int) ($cancelled[$key] ?? 0),
            ])
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public function tenantGrowth(PlatformPeriod $period): array
    {
        $baseline = Tenant::query()->where('created_at', '<', $period->fromUtc)->count();

        $new = Tenant::query()
            ->whereBetween('created_at', [$period->fromUtc, $period->toUtc])
            ->pluck('created_at')
            ->groupBy(fn (Carbon $at) => $period->monthKey($at))
            ->map->count();

        $running = $baseline;

        return collect($period->monthKeys())
            ->map(function (string $key) use ($new, &$running) {
                $added = (int) ($new[$key] ?? 0);
                $running += $added;

                return ['month' => PlatformPeriod::monthLabel($key), 'new' => $added, 'total' => $running];
            })
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public function revenueByPlan(PlatformPeriod $period): array
    {
        $grouped = [];
        foreach (
            SubscriptionInvoice::withoutGlobalScopes()
                ->with('subscription.plan')
                ->where('status', 'paid')
                ->whereBetween('paid_at', [$period->fromUtc, $period->toUtc])
                ->get() as $invoice
        ) {
            $name = $invoice->subscription?->plan?->name ?? 'Unassigned';
            $grouped[$name] = ($grouped[$name] ?? 0) + (float) $invoice->amount;
        }

        arsort($grouped);

        return collect($grouped)
            ->map(fn (float $amount, string $plan) => ['plan' => $plan, 'collected' => round($amount, 2)])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public function subscriptionsByStatus(): array
    {
        return Subscription::withoutGlobalScopes()
            ->get()
            ->groupBy(fn (Subscription $s) => $s->status->value)
            ->map(fn ($group, string $status) => ['status' => ucfirst(str_replace('_', ' ', $status)), 'count' => $group->count()])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public function recentTenants(int $limit = 8): array
    {
        return Tenant::query()->with('subscription.plan')->latest('id')->limit($limit)->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->getKey(),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status->value,
                'plan' => $tenant->subscription?->plan?->name,
                'subscription_status' => $tenant->subscription?->status->value,
                'created_at' => $tenant->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /** @return list<array<string, mixed>> */
    public function recentActivity(int $limit = 15): array
    {
        return AuditLog::query()->with(['actor:id,name'])->latest('id')->limit($limit)->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->getKey(),
                'action' => $log->action,
                'actor' => $log->actor?->name,
                'tenant_id' => $log->tenant_id,
                'subject' => $log->subject_type ? class_basename($log->subject_type).'#'.$log->subject_id : null,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->all();
    }

    protected function normalizedMonthly(Subscription $subscription): float
    {
        $plan = $subscription->plan;

        if (! $plan) {
            return 0.0;
        }

        return $subscription->billing_cycle->value === 'yearly'
            ? (float) $plan->price_yearly / 12
            : (float) $plan->price_monthly;
    }
}
