<?php

namespace App\Domain\Marketing\Google;

use App\Domain\Marketing\Models\MarketingIntegration;
use Illuminate\Support\Facades\Http;

/**
 * Google Search Console client (read-only search analytics).
 */
class SearchConsoleClient
{
    public const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

    protected const BASE = 'https://www.googleapis.com/webmasters/v3';

    public function __construct(protected GoogleConnection $connection) {}

    /**
     * The verified properties this account can see.
     *
     * @return array{ok: bool, error: ?string, sites: list<string>, http_status: ?int}
     */
    public function sites(MarketingIntegration $integration): array
    {
        $token = $this->connection->accessToken($integration, self::SCOPES);

        if (! $token['ok']) {
            return ['ok' => false, 'error' => $token['error'], 'sites' => [], 'http_status' => null];
        }

        try {
            $response = Http::withToken((string) $token['token'])->timeout(20)->get(self::BASE.'/sites');
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach Search Console: '.$e->getMessage(), 'sites' => [], 'http_status' => null];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => $this->describeFailure($response->status(), $response->json('error.message')),
                'sites' => [],
                'http_status' => $response->status(),
            ];
        }

        $sites = collect($response->json('siteEntry') ?? [])
            ->pluck('siteUrl')
            ->filter()
            ->values()
            ->all();

        return ['ok' => true, 'error' => null, 'sites' => $sites, 'http_status' => $response->status()];
    }

    /**
     * @param  array<string, mixed>  $payload  startDate, endDate, dimensions, rowLimit, type
     * @return array{ok: bool, error: ?string, rows: list<array<string, mixed>>, http_status: ?int}
     */
    public function query(MarketingIntegration $integration, array $payload): array
    {
        $siteUrl = trim((string) ($integration->credentials['site_url'] ?? ''));

        if ($siteUrl === '') {
            return ['ok' => false, 'error' => 'No Search Console property is configured.', 'rows' => [], 'http_status' => null];
        }

        $token = $this->connection->accessToken($integration, self::SCOPES);

        if (! $token['ok']) {
            return ['ok' => false, 'error' => $token['error'], 'rows' => [], 'http_status' => null];
        }

        $payload['rowLimit'] ??= 100;
        $payload['type'] ??= 'web';

        try {
            $response = Http::withToken((string) $token['token'])
                ->timeout(30)
                ->post(self::BASE.'/sites/'.rawurlencode($siteUrl).'/searchAnalytics/query', $payload);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach Search Console: '.$e->getMessage(), 'rows' => [], 'http_status' => null];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => $this->describeFailure($response->status(), $response->json('error.message')),
                'rows' => [],
                'http_status' => $response->status(),
            ];
        }

        $rows = collect($response->json('rows') ?? [])
            ->map(fn (array $row) => [
                'keys' => $row['keys'] ?? [],
                'clicks' => (float) ($row['clicks'] ?? 0),
                'impressions' => (float) ($row['impressions'] ?? 0),
                'ctr' => (float) ($row['ctr'] ?? 0),
                'position' => (float) ($row['position'] ?? 0),
            ])
            ->values()
            ->all();

        return ['ok' => true, 'error' => null, 'rows' => $rows, 'http_status' => $response->status()];
    }

    protected function describeFailure(int $status, ?string $message): string
    {
        $message = (string) ($message ?? '');

        return match (true) {
            $status === 401 => 'Google rejected the access token. Reconnect the Google account.',
            $status === 403 => 'This account cannot read that property'.($message !== '' ? ': '.$message : '. Add the account as a user on the Search Console property.'),
            $status === 404 => 'Search Console has no such property'.($message !== '' ? ': '.$message : '. Check the exact property string — sc-domain:example.com and https://example.com/ are different properties.'),
            $status === 429 => 'The Search Console quota was exceeded. Try again later.',
            default => 'Search Console returned HTTP '.$status.($message !== '' ? ': '.$message : '.'),
        };
    }
}
