<?php

namespace App\Jobs;

use App\Domain\Marketing\Google\GoogleAdsClient;
use App\Domain\Marketing\Google\GoogleAnalyticsClient;
use App\Domain\Marketing\Google\SearchConsoleClient;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Domain\Marketing\Models\MarketingCampaign;
use App\Domain\Marketing\Models\MarketingCampaignSpend;
use App\Domain\Marketing\Models\MarketingIntegration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Pulls read-only reporting data from a Google integration.
 *
 * Every run writes a `marketing_sync_logs` row and refreshes the integration's
 * snapshot, so a screen can show when its numbers were actually fetched rather than
 * implying they are live. A failed sync updates `last_error` and leaves the previous
 * snapshot in place — stale data is labelled, never silently replaced by zeros.
 */
class SyncMarketingIntegrationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    /** @var list<int> */
    public array $backoff = [30, 120];

    /** Reporting window, in days, ending yesterday (today is incomplete). */
    public const WINDOW_DAYS = 28;

    public function __construct(public string $provider) {}

    public function handle(
        MarketingIntegrationService $integrations,
        GoogleAnalyticsClient $analytics,
        SearchConsoleClient $searchConsole,
        GoogleAdsClient $ads,
    ): void {
        $integration = $integrations->forProvider($this->provider);

        if ($integration === null || ! $integration->isOperational()) {
            return;
        }

        $started = Carbon::now();

        [$entity, $result] = match ($this->provider) {
            'google_analytics' => ['ga4_report', $this->syncAnalytics($integration, $analytics, $integrations)],
            'search_console' => ['gsc_searchanalytics', $this->syncSearchConsole($integration, $searchConsole, $integrations)],
            'google_ads' => ['ads_spend', $this->syncAds($integration, $ads, $integrations)],
            default => ['unsupported', ['ok' => false, 'error' => 'This provider has nothing to sync.']],
        };

        $integrations->recordSync($this->provider, $entity, $result + ['direction' => 'pull'], $started);
    }

    /** @return array{ok: bool, error?: ?string, items?: int, meta?: array<string, mixed>} */
    protected function syncAnalytics(
        MarketingIntegration $integration,
        GoogleAnalyticsClient $client,
        MarketingIntegrationService $integrations,
    ): array {
        [$from, $to] = $this->window();

        $overview = $client->runReport($integration, $from, $to, [
            ['name' => 'activeUsers'],
            ['name' => 'newUsers'],
            ['name' => 'sessions'],
            ['name' => 'engagementRate'],
            ['name' => 'screenPageViews'],
        ]);

        if (! $overview['ok']) {
            return ['ok' => false, 'error' => $overview['error']];
        }

        $channels = $client->runReport(
            $integration,
            $from,
            $to,
            [['name' => 'sessions'], ['name' => 'activeUsers']],
            [['name' => 'sessionDefaultChannelGroup']],
            10,
        );

        $pages = $client->runReport(
            $integration,
            $from,
            $to,
            [['name' => 'screenPageViews'], ['name' => 'activeUsers'], ['name' => 'engagementRate']],
            [['name' => 'landingPagePlusQueryString']],
            15,
        );

        $integrations->storeSnapshot($this->provider, 'ga4_snapshot', [
            'from' => $from,
            'to' => $to,
            'totals' => $this->metricTotals($overview),
            'channels' => $channels['ok'] ? $this->pivot($channels['rows'], 'sessionDefaultChannelGroup') : [],
            'landing_pages' => $pages['ok'] ? $this->pivot($pages['rows'], 'landingPagePlusQueryString') : [],
            'partial_failures' => array_values(array_filter([
                $channels['ok'] ? null : 'Channel breakdown: '.$channels['error'],
                $pages['ok'] ? null : 'Landing pages: '.$pages['error'],
            ])),
        ]);

        return [
            'ok' => true,
            'items' => count($overview['rows']) + count($channels['rows']) + count($pages['rows']),
            'meta' => ['window' => $from.' → '.$to],
        ];
    }

    /** @return array{ok: bool, error?: ?string, items?: int, meta?: array<string, mixed>} */
    protected function syncSearchConsole(
        MarketingIntegration $integration,
        SearchConsoleClient $client,
        MarketingIntegrationService $integrations,
    ): array {
        [$from, $to] = $this->window();

        $totals = $client->query($integration, [
            'startDate' => $from,
            'endDate' => $to,
            'dimensions' => ['date'],
            'rowLimit' => 1,
        ]);

        if (! $totals['ok']) {
            return ['ok' => false, 'error' => $totals['error']];
        }

        $queries = $client->query($integration, [
            'startDate' => $from,
            'endDate' => $to,
            'dimensions' => ['query'],
            'rowLimit' => 25,
        ]);

        $pages = $client->query($integration, [
            'startDate' => $from,
            'endDate' => $to,
            'dimensions' => ['page'],
            'rowLimit' => 25,
        ]);

        $countries = $client->query($integration, [
            'startDate' => $from,
            'endDate' => $to,
            'dimensions' => ['country'],
            'rowLimit' => 15,
        ]);

        $queriesRows = $queries['ok'] ? $queries['rows'] : [];

        // The date dimension with a single row gives period totals for the site.
        $summary = $totals['rows'][0] ?? null;

        $integrations->storeSnapshot($this->provider, 'gsc_snapshot', [
            'from' => $from,
            'to' => $to,
            'summary' => $summary,
            'queries' => array_map(fn (array $row) => $this->gscRow($row), $queriesRows),
            'pages' => $pages['ok'] ? array_map(fn (array $row) => $this->gscRow($row), $pages['rows']) : [],
            'countries' => $countries['ok'] ? array_map(fn (array $row) => $this->gscRow($row), $countries['rows']) : [],
            'partial_failures' => array_values(array_filter([
                $pages['ok'] ? null : 'Top pages: '.$pages['error'],
                $countries['ok'] ? null : 'Countries: '.$countries['error'],
                $queries['ok'] ? null : 'Top queries: '.$queries['error'],
            ])),
            'data_lag_note' => 'Search Console reports two to three days behind reality.',
        ]);

        return [
            'ok' => true,
            'items' => count($queriesRows),
            'meta' => ['window' => $from.' → '.$to],
        ];
    }

    /**
     * Google Ads spend, written as real spend records.
     *
     * An Ads campaign with no matching internal campaign is created so the spend has
     * somewhere to live; the note records that it came from the sync rather than
     * being invented, and the slug is derived from the Ads campaign id so repeated
     * syncs update the same row.
     *
     * @return array{ok: bool, error?: ?string, items?: int, meta?: array<string, mixed>}
     */
    protected function syncAds(
        MarketingIntegration $integration,
        GoogleAdsClient $client,
        MarketingIntegrationService $integrations,
    ): array {
        [$from, $to] = $this->window();

        $result = $client->campaignSpend($integration, $from, $to);

        if (! $result['ok']) {
            return ['ok' => false, 'error' => $result['error']];
        }

        $currency = $result['currency'];

        if ($currency === null) {
            return [
                'ok' => false,
                'error' => 'Google Ads did not report an account currency, so spend cannot be recorded without guessing one.',
            ];
        }

        $written = 0;

        foreach ($result['rows'] as $row) {
            if ($row['campaign_id'] === null) {
                continue;
            }

            $campaign = MarketingCampaign::query()->firstOrCreate(
                ['slug' => 'google-ads-'.Str::slug((string) $row['campaign_id'])],
                [
                    'name' => $row['campaign_name'] ?? ('Google Ads campaign '.$row['campaign_id']),
                    'channel' => 'google_ads',
                    'status' => 'active',
                    'start_date' => $from,
                    'currency' => $currency,
                    'notes' => 'Created automatically from Google Ads spend sync. Rename or link it to an internal campaign as you like.',
                ],
            );

            MarketingCampaignSpend::query()->updateOrCreate(
                [
                    'campaign_id' => $campaign->getKey(),
                    'period_start' => $from,
                    'period_end' => $to,
                    'source' => 'google_ads',
                ],
                [
                    'channel' => 'google_ads',
                    'amount' => $row['cost'],
                    'currency' => $currency,
                    'imported_at' => Carbon::now(),
                ],
            );

            $written++;
        }

        $integrations->storeSnapshot($this->provider, 'ads_snapshot', [
            'from' => $from,
            'to' => $to,
            'currency' => $currency,
            'campaigns' => $result['rows'],
            'total_cost' => round(array_sum(array_column($result['rows'], 'cost')), 2),
        ]);

        return [
            'ok' => true,
            'items' => $written,
            'meta' => ['window' => $from.' → '.$to, 'currency' => $currency],
        ];
    }

    /** @return array{0: string, 1: string} */
    protected function window(): array
    {
        return [
            Carbon::now()->subDays(self::WINDOW_DAYS + 1)->toDateString(),
            Carbon::now()->subDay()->toDateString(),
        ];
    }

    /**
     * @param  array{rows: list<array<string, mixed>>, totals: array<string, mixed>}  $report
     * @return array<string, mixed>
     */
    protected function metricTotals(array $report): array
    {
        $names = ['activeUsers', 'newUsers', 'sessions', 'engagementRate', 'screenPageViews'];
        $first = $report['rows'][0] ?? [];
        $totals = [];

        foreach ($names as $name) {
            if (array_key_exists($name, $first)) {
                $totals[$name] = $first[$name];
            }
        }

        return $totals;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    protected function pivot(array $rows, string $dimension): array
    {
        return array_map(function (array $row) use ($dimension) {
            $entry = ['label' => $row[$dimension] ?? '(not set)'];
            unset($row[$dimension]);

            return array_merge($entry, $row);
        }, $rows);
    }

    /** @return array<string, mixed> */
    protected function gscRow(array $row): array
    {
        return [
            'key' => $row['keys'][0] ?? null,
            'clicks' => $row['clicks'],
            'impressions' => $row['impressions'],
            'ctr' => $row['ctr'],
            'position' => $row['position'],
        ];
    }
}
