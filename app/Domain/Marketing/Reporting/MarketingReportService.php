<?php

namespace App\Domain\Marketing\Reporting;

use App\Domain\Communications\Models\Campaign;
use App\Domain\Marketing\Analytics\MarketingAnalyticsService;
use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\MarketingOverviewService;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\PlatformAnalytics\PlatformPeriod;

/**
 * Marketing reports.
 *
 * Every report carries its own definition, source and limitation, because a number
 * without those is an opinion. Rows are plain arrays so the same data feeds both the
 * screen and the CSV export — they cannot drift.
 */
class MarketingReportService
{
    public function __construct(
        protected MarketingAnalyticsService $analytics,
        protected MarketingOverviewService $overview,
        protected EmailMarketingService $emails,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function all(PlatformPeriod $period): array
    {
        return array_values(array_filter([
            $this->traffic($period),
            $this->campaigns($period),
            $this->leads($period),
            $this->channels($period),
            $this->acquisition($period),
            $this->retention($period),
            $this->email(),
        ]));
    }

    /** @return array<string, mixed>|null */
    public function one(string $key, PlatformPeriod $period): ?array
    {
        foreach ($this->all($period) as $report) {
            if ($report['key'] === $key) {
                return $report;
            }
        }

        return null;
    }

    /** @return array<string, mixed> */
    protected function traffic(PlatformPeriod $period): array
    {
        $block = collect($this->overview->blocks($period))->firstWhere('key', 'website');

        return [
            'key' => 'traffic',
            'title' => 'Website traffic',
            'definition' => 'Page views, unique visitors and channel mix, counted from this platform\'s own first-party tracking.',
            'source' => 'marketing_events, marketing_visitors',
            'limitation' => 'Only consenting visitors are counted, so these figures are lower than raw server hits. They will also differ from GA4, which measures the same site its own way.',
            'columns' => [['key' => 'metric', 'label' => 'Metric'], ['key' => 'value', 'label' => 'Value']],
            'rows' => collect($block['items'] ?? [])->map(fn (array $item) => [
                'metric' => $item['label'],
                'value' => $item['available'] ? (string) $item['value'] : ($item['reason'] ?? '—'),
            ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function campaigns(PlatformPeriod $period): array
    {
        $rows = Campaign::query()->latest('id')->limit(100)->get()->map(fn (Campaign $campaign) => [
            'campaign' => $campaign->name,
            'status' => $campaign->status,
            'recipients' => $campaign->total_recipients,
            'sent' => $campaign->sent_count,
            'failed' => $campaign->failed_count,
            'opens' => $campaign->open_count,
            'clicks' => $campaign->click_count,
        ])->all();

        return [
            'key' => 'campaigns',
            'title' => 'Email campaigns',
            'definition' => 'Per-campaign delivery counts as recorded per recipient at send time.',
            'source' => 'campaigns, marketing_email_sends',
            'limitation' => 'Open counts are approximate — image blocking and privacy proxies affect them. Bounces are not available from a raw SMTP path.',
            'columns' => [
                ['key' => 'campaign', 'label' => 'Campaign'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'recipients', 'label' => 'Recipients', 'align' => 'right'],
                ['key' => 'sent', 'label' => 'Sent', 'align' => 'right'],
                ['key' => 'failed', 'label' => 'Failed', 'align' => 'right'],
                ['key' => 'opens', 'label' => 'Opens', 'align' => 'right'],
                ['key' => 'clicks', 'label' => 'Clicks', 'align' => 'right'],
            ],
            'rows' => $rows,
        ];
    }

    /** @return array<string, mixed> */
    protected function leads(PlatformPeriod $period): array
    {
        $rows = MarketingLead::query()
            ->whereBetween('created_at', [$period->fromUtc, $period->toUtc])
            ->get()
            ->groupBy(fn (MarketingLead $lead) => $lead->source->label())
            ->map(fn ($group, string $source) => [
                'source' => $source,
                'leads' => $group->count(),
                'converted' => $group->filter(fn (MarketingLead $lead) => $lead->converted_at !== null)->count(),
                'rate' => $group->count() > 0 ? round($group->filter(fn (MarketingLead $lead) => $lead->converted_at !== null)->count() / $group->count() * 100, 1) : 0.0,
            ])
            ->sortByDesc('leads')
            ->values()
            ->all();

        return [
            'key' => 'leads',
            'title' => 'Lead generation',
            'definition' => 'Leads captured in the period, by source, and how many became customers.',
            'source' => 'marketing_leads',
            'limitation' => 'A lead only counts as converted when it is linked to a restaurant. Registrations that never came through marketing are not leads.',
            'columns' => [
                ['key' => 'source', 'label' => 'Source'],
                ['key' => 'leads', 'label' => 'Leads', 'align' => 'right'],
                ['key' => 'converted', 'label' => 'Converted', 'align' => 'right'],
                ['key' => 'rate', 'label' => 'Conversion', 'align' => 'right'],
            ],
            'rows' => $rows,
        ];
    }

    /** @return array<string, mixed> */
    protected function channels(PlatformPeriod $period): array
    {
        $payload = $this->analytics->attribution($period);
        $rows = [];

        foreach ($payload['models'] as $model => $block) {
            foreach ($block['channels'] as $channel) {
                $rows[] = [
                    'model' => $model,
                    'channel' => $channel['label'],
                    'customers' => $channel['customers'],
                    'revenue' => collect($channel['value'])->map(fn (array $entry) => $entry['currency'].' '.number_format($entry['amount'], 2))->implode(' · '),
                ];
            }
        }

        return [
            'key' => 'channels',
            'title' => 'Channel performance',
            'definition' => 'Customers and attributed revenue per channel, under each attribution model.',
            'source' => 'marketing_attributions, subscription_invoices',
            'limitation' => 'Attribution is this platform\'s own measurement and will disagree with the ad platforms, which each use their own model. Revenue is per currency and never converted.',
            'columns' => [
                ['key' => 'model', 'label' => 'Model'],
                ['key' => 'channel', 'label' => 'Channel'],
                ['key' => 'customers', 'label' => 'Customers', 'align' => 'right'],
                ['key' => 'revenue', 'label' => 'Attributed revenue', 'align' => 'right'],
            ],
            'rows' => $rows,
        ];
    }

    /** @return array<string, mixed> */
    protected function acquisition(PlatformPeriod $period): array
    {
        $payload = $this->analytics->acquisition($period);

        $rows = collect($payload['by_country'])->map(fn (array $row) => [
            'group' => 'Country',
            'label' => $row['label'],
            'count' => $row['count'],
        ])->merge(
            collect($payload['by_plan'])->map(fn (array $row) => [
                'group' => 'Plan',
                'label' => $row['label'],
                'count' => $row['count'],
            ])
        )->all();

        return [
            'key' => 'acquisition',
            'title' => 'Restaurant acquisition',
            'definition' => 'New restaurants in the period, split by billing country and by plan.',
            'source' => 'tenants, subscriptions',
            'limitation' => 'Country comes from the tenant\'s billing region, not from where they signed in.',
            'columns' => [
                ['key' => 'group', 'label' => 'Dimension'],
                ['key' => 'label', 'label' => 'Value'],
                ['key' => 'count', 'label' => 'Restaurants', 'align' => 'right'],
            ],
            'rows' => $rows,
        ];
    }

    /** @return array<string, mixed> */
    protected function retention(PlatformPeriod $period): array
    {
        $payload = $this->analytics->retention($period);

        return [
            'key' => 'retention',
            'title' => 'Churn and retention',
            'definition' => 'Churn is customers lost during the period ÷ customers active at its start. Cohorts are signup months.',
            'source' => 'subscriptions',
            'limitation' => 'Cohorts show each month\'s retention today, not a month-by-month matrix. Revenue churn is not calculated.',
            'columns' => [
                ['key' => 'cohort', 'label' => 'Cohort'],
                ['key' => 'signups', 'label' => 'Signups', 'align' => 'right'],
                ['key' => 'active', 'label' => 'Still active', 'align' => 'right'],
                ['key' => 'retention', 'label' => 'Retention', 'align' => 'right'],
            ],
            'rows' => $payload['cohorts'],
        ];
    }

    /** @return array<string, mixed> */
    protected function email(): array
    {
        $rows = Campaign::query()->latest('id')->limit(100)->get()->map(function (Campaign $campaign) {
            $stats = $this->emails->stats($campaign);

            return [
                'campaign' => $campaign->name,
                'sent' => $stats['sent'],
                'open_rate' => $stats['open_rate'],
                'click_rate' => $stats['click_rate'],
                'unsubscribed' => $stats['unsubscribed'],
                'bounces' => $stats['bounces'] === null ? 'not available' : $stats['bounces'],
            ];
        })->all();

        return [
            'key' => 'email',
            'title' => 'Email performance',
            'definition' => 'Delivery, open and click rates per campaign.',
            'source' => 'marketing_email_sends, marketing_email_clicks',
            'limitation' => 'Open rates are approximate. Bounce and complaint data needs an email provider with webhooks; a raw SMTP path reports only immediate transport rejections.',
            'columns' => [
                ['key' => 'campaign', 'label' => 'Campaign'],
                ['key' => 'sent', 'label' => 'Sent', 'align' => 'right'],
                ['key' => 'open_rate', 'label' => 'Open rate', 'align' => 'right'],
                ['key' => 'click_rate', 'label' => 'Click rate', 'align' => 'right'],
                ['key' => 'unsubscribed', 'label' => 'Unsubscribed', 'align' => 'right'],
                ['key' => 'bounces', 'label' => 'Bounces', 'align' => 'right'],
            ],
            'rows' => $rows,
        ];
    }
}
