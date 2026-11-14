<?php

namespace App\Domain\Marketing\Insights;

use App\Domain\Marketing\Analytics\MarketingAnalyticsService;
use App\Domain\Marketing\Enums\AlertOperator;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Domain\Marketing\Models\MarketingAlertRule;
use App\Domain\Marketing\Models\MarketingInsight;
use App\Domain\Marketing\Models\MarketingIntegration;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Notifications\PlatformNotificationService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Marketing alerts.
 *
 * Each rule is a metric, an operator and a threshold, evaluated hourly with a cooldown
 * so a persistent breach does not raise the same alert on every run. A metric that
 * cannot be computed is skipped rather than treated as zero — an unconfigured
 * integration must not look like a healthy one.
 */
class InsightService
{
    public function __construct(
        protected MarketingAnalyticsService $analytics,
        protected MarketingIntegrationService $integrations,
    ) {}

    /**
     * The built-in rules. Safe to call repeatedly.
     *
     * @return int how many were created
     */
    public function ensureRules(): int
    {
        $created = 0;

        foreach ($this->defaults() as $rule) {
            $model = MarketingAlertRule::query()->firstOrCreate(
                ['key' => $rule['key']],
                $rule + ['is_enabled' => true, 'cooldown_minutes' => 1440],
            );

            $created += $model->wasRecentlyCreated ? 1 : 0;
        }

        return $created;
    }

    /**
     * @return array{evaluated: int, fired: int}
     */
    public function evaluate(): array
    {
        $this->ensureRules();

        $period = PlatformPeriod::make(null, null, '90d');
        $metrics = $this->metrics($period);
        $evaluated = 0;
        $fired = 0;

        foreach (MarketingAlertRule::query()->enabled()->get() as $rule) {
            $value = $metrics[$rule->metric]['value'] ?? null;

            if ($value === null) {
                continue;
            }

            $evaluated++;

            if (! $rule->matches((float) $value) || $rule->isCoolingDown()) {
                continue;
            }

            $insight = MarketingInsight::create([
                'rule_id' => $rule->getKey(),
                'severity' => $this->severityFor($rule),
                'title' => $rule->name,
                'body' => $this->bodyFor($rule, (float) $value, $metrics[$rule->metric]),
                'data' => [
                    'metric' => $rule->metric,
                    'value' => $value,
                    'threshold' => (float) $rule->threshold,
                    'window' => $rule->window,
                ],
                'generated_at' => Carbon::now(),
            ]);

            $rule->forceFill(['last_triggered_at' => Carbon::now()])->save();
            $fired++;

            $this->notify($insight);
        }

        return ['evaluated' => $evaluated, 'fired' => $fired];
    }

    public function acknowledge(MarketingInsight $insight, ?User $actor = null): MarketingInsight
    {
        $insight->forceFill([
            'acknowledged_at' => Carbon::now(),
            'acknowledged_by' => $actor?->getKey(),
        ])->save();

        return $insight;
    }

    /**
     * Every rule's metric, with `value: null` when it cannot be computed.
     *
     * @return array<string, array{label: string, unit: string, value: float|int|null, reason?: string}>
     */
    public function metrics(PlatformPeriod $period): array
    {
        $retention = $this->analytics->retention($period);

        $everTrialed = Subscription::withoutGlobalScopes()
            ->whereNotNull('trial_ends_at')
            ->where('status', '!=', SubscriptionStatus::Trialing->value)
            ->count();

        $converted = Subscription::withoutGlobalScopes()
            ->whereNotNull('trial_ends_at')
            ->whereIn('status', [SubscriptionStatus::Active->value, SubscriptionStatus::PastDue->value])
            ->count();

        return [
            'churn_rate' => [
                'label' => 'Customer churn rate',
                'unit' => 'percent',
                'value' => $retention['churn_rate'],
                'reason' => $retention['churn_rate'] === null ? 'No customers were active at the start of the period.' : null,
            ],
            'trial_conversion' => [
                'label' => 'Trial conversion rate',
                'unit' => 'percent',
                'value' => $everTrialed > 0 ? round($converted / $everTrialed * 100, 1) : null,
                'reason' => $everTrialed === 0 ? 'No subscription has finished a trial yet.' : null,
            ],
            'unworked_leads' => [
                'label' => 'Open leads with no owner',
                'unit' => 'count',
                'value' => (float) MarketingLead::query()->open()->whereNull('assigned_to')->count(),
            ],
            'integration_errors' => [
                'label' => 'Integrations in an error state',
                'unit' => 'count',
                'value' => (float) MarketingIntegration::query()->where('status', 'error')->count(),
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    public function defaults(): array
    {
        return [
            ['key' => 'churn_spike', 'name' => 'Churn is higher than usual', 'metric' => 'churn_rate', 'operator' => AlertOperator::GreaterThan->value, 'threshold' => 10, 'window' => '90d'],
            ['key' => 'trial_conversion_low', 'name' => 'Trial conversion has dropped', 'metric' => 'trial_conversion', 'operator' => AlertOperator::LessThan->value, 'threshold' => 20, 'window' => '90d'],
            ['key' => 'leads_unworked', 'name' => 'Leads are piling up unassigned', 'metric' => 'unworked_leads', 'operator' => AlertOperator::GreaterThan->value, 'threshold' => 20, 'window' => '24h'],
            ['key' => 'integration_error', 'name' => 'A marketing integration is failing', 'metric' => 'integration_errors', 'operator' => AlertOperator::GreaterThan->value, 'threshold' => 0, 'window' => '24h'],
        ];
    }

    protected function severityFor(MarketingAlertRule $rule): string
    {
        return match ($rule->key) {
            'integration_error' => 'critical',
            'churn_spike', 'trial_conversion_low' => 'warning',
            default => 'info',
        };
    }

    /** @param array{label: string, unit: string} $metric */
    protected function bodyFor(MarketingAlertRule $rule, float $value, array $metric): string
    {
        $rendered = $metric['unit'] === 'percent' ? $value.'%' : number_format($value);

        return $metric['label'].' is '.$rendered.', which is '.$rule->operator->label().' the threshold of '
            .($metric['unit'] === 'percent' ? $rule->threshold.'%' : $rule->threshold).'.';
    }

    protected function notify(MarketingInsight $insight): void
    {
        try {
            app(PlatformNotificationService::class)->send(
                'marketing',
                'platform.marketing.view',
                $insight->title,
                (string) $insight->body,
                $insight->severity,
                '/platform/marketing/reports',
            );
        } catch (\Throwable $e) {
            // The insight is already stored; a notification failure must not lose it.
            Log::warning('Marketing insight notification could not be sent.', ['error' => $e->getMessage()]);
        }
    }
}
