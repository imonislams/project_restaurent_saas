<?php

namespace App\Domain\Marketing\Google;

use App\Domain\Marketing\Models\MarketingIntegration;
use Illuminate\Support\Facades\Http;

/**
 * Google Ads API client — read-only, and only used when a developer token exists.
 *
 * A developer token is issued by Google after review, so spend sync stays switched
 * off until one is supplied. Conversion tracking does not depend on it at all and
 * works through the tag layer.
 */
class GoogleAdsClient
{
    public const SCOPES = ['https://www.googleapis.com/auth/adwords'];

    public const API_VERSION = 'v18';

    protected const BASE = 'https://googleads.googleapis.com';

    public function __construct(protected GoogleConnection $connection) {}

    public function hasDeveloperToken(MarketingIntegration $integration): bool
    {
        return trim((string) ($integration->credentials['developer_token'] ?? '')) !== '';
    }

    public function customerId(MarketingIntegration $integration): ?string
    {
        $raw = trim((string) ($integration->credentials['customer_id'] ?? ''));
        $digits = preg_replace('/\D+/', '', $raw);

        return is_string($digits) && $digits !== '' ? $digits : null;
    }

    /**
     * Prove the credentials work by reading the customer resource.
     *
     * @return array{ok: bool, error: ?string, detail: array<string, mixed>, http_status: ?int}
     */
    public function testConnection(MarketingIntegration $integration): array
    {
        if (! $this->hasDeveloperToken($integration)) {
            return [
                'ok' => false,
                'error' => 'Spend sync needs a Google Ads developer token, which Google issues after review. Conversion tracking can still be configured without one.',
                'detail' => ['developer_token' => false],
                'http_status' => null,
            ];
        }

        $customerId = $this->customerId($integration);

        if ($customerId === null) {
            return ['ok' => false, 'error' => 'No Google Ads customer id is configured.', 'detail' => [], 'http_status' => null];
        }

        $token = $this->connection->accessToken($integration, self::SCOPES);

        if (! $token['ok']) {
            return ['ok' => false, 'error' => $token['error'], 'detail' => [], 'http_status' => null];
        }

        try {
            $response = Http::withToken((string) $token['token'])
                ->withHeaders($this->headers($integration))
                ->timeout(20)
                ->get(self::BASE.'/'.self::API_VERSION.'/customers/'.$customerId);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach the Google Ads API: '.$e->getMessage(), 'detail' => [], 'http_status' => null];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => $this->describeFailure($response->status(), $response->json('error.message')),
                'detail' => ['developer_token' => true],
                'http_status' => $response->status(),
            ];
        }

        return [
            'ok' => true,
            'error' => null,
            'detail' => [
                'developer_token' => true,
                'customer_id' => $customerId,
                'customer_name' => $response->json('descriptiveName'),
                'currency' => $response->json('currencyCode'),
                'time_zone' => $response->json('timeZone'),
            ],
            'http_status' => $response->status(),
        ];
    }

    /**
     * Campaign spend for a date range, in the account's own currency.
     *
     * @return array{ok: bool, error: ?string, rows: list<array<string, mixed>>, currency: ?string, http_status: ?int}
     */
    public function campaignSpend(MarketingIntegration $integration, string $from, string $to): array
    {
        if (! $this->hasDeveloperToken($integration)) {
            return ['ok' => false, 'error' => 'Spend sync needs a developer token.', 'rows' => [], 'currency' => null, 'http_status' => null];
        }

        $customerId = $this->customerId($integration);

        if ($customerId === null) {
            return ['ok' => false, 'error' => 'No Google Ads customer id is configured.', 'rows' => [], 'currency' => null, 'http_status' => null];
        }

        $token = $this->connection->accessToken($integration, self::SCOPES);

        if (! $token['ok']) {
            return ['ok' => false, 'error' => $token['error'], 'rows' => [], 'currency' => null, 'http_status' => null];
        }

        $query = <<<GAQL
            SELECT campaign.id, campaign.name, campaign.status,
                   metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.ctr,
                   customer.currency_code
            FROM campaign
            WHERE segments.date BETWEEN '{$from}' AND '{$to}'
            ORDER BY metrics.cost_micros DESC
            LIMIT 200
            GAQL;

        try {
            $response = Http::withToken((string) $token['token'])
                ->withHeaders($this->headers($integration))
                ->timeout(45)
                ->post(self::BASE.'/'.self::API_VERSION.'/customers/'.$customerId.'/googleAds:search', [
                    'query' => $query,
                ]);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Could not reach the Google Ads API: '.$e->getMessage(), 'rows' => [], 'currency' => null, 'http_status' => null];
        }

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => $this->describeFailure($response->status(), $response->json('error.message')),
                'rows' => [],
                'currency' => null,
                'http_status' => $response->status(),
            ];
        }

        $rows = [];
        $currency = null;

        foreach ($response->json('results') ?? [] as $result) {
            $metrics = $result['metrics'] ?? [];
            $currency ??= $result['customer']['currencyCode'] ?? null;

            $rows[] = [
                'campaign_id' => $result['campaign']['id'] ?? null,
                'campaign_name' => $result['campaign']['name'] ?? null,
                'status' => $result['campaign']['status'] ?? null,
                // Google reports cost in micros.
                'cost' => round(((int) ($metrics['costMicros'] ?? 0)) / 1_000_000, 2),
                'clicks' => (int) ($metrics['clicks'] ?? 0),
                'impressions' => (int) ($metrics['impressions'] ?? 0),
                'ctr' => (float) ($metrics['ctr'] ?? 0),
            ];
        }

        return ['ok' => true, 'error' => null, 'rows' => $rows, 'currency' => $currency, 'http_status' => $response->status()];
    }

    /** @return array<string, string> */
    protected function headers(MarketingIntegration $integration): array
    {
        $headers = ['developer-token' => (string) ($integration->credentials['developer_token'] ?? '')];

        $loginCustomerId = preg_replace('/\D+/', '', (string) ($integration->credentials['login_customer_id'] ?? ''));

        if (is_string($loginCustomerId) && $loginCustomerId !== '') {
            $headers['login-customer-id'] = $loginCustomerId;
        }

        return $headers;
    }

    protected function describeFailure(int $status, ?string $message): string
    {
        $message = (string) ($message ?? '');

        return match (true) {
            $status === 401 => 'Google rejected the access token. Reconnect the Google account.',
            $status === 403 => 'Google refused the request'.($message !== '' ? ': '.$message : '. The developer token may still be pending approval, or the account is not under the configured manager account.'),
            $status === 429 => 'The Google Ads API quota was exceeded. Try again later.',
            default => 'The Google Ads API returned HTTP '.$status.($message !== '' ? ': '.$message : '.'),
        };
    }
}
