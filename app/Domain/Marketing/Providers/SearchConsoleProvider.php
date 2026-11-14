<?php

namespace App\Domain\Marketing\Providers;

use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\Google\GoogleConnection;
use App\Domain\Marketing\Google\SearchConsoleClient;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * Google Search Console.
 *
 * The connection test proves that the account can actually see the configured
 * property — the failure operators hit most is a property string that does not
 * match (`sc-domain:example.com` and `https://example.com/` are different
 * properties), so the error names the properties that *are* visible.
 */
class SearchConsoleProvider implements MarketingProvider
{
    public function __construct(
        protected GoogleConnection $connection,
        protected SearchConsoleClient $client,
    ) {}

    public function key(): string
    {
        return 'search_console';
    }

    public function label(): string
    {
        return 'Google Search Console';
    }

    public function capabilities(): array
    {
        return ['sync', 'search_analytics'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->key());
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        $siteUrl = trim((string) ($integration->credentials['site_url'] ?? ''));

        if ($siteUrl === '') {
            return ['ok' => false, 'error' => 'Enter the exact Search Console property string.', 'detail' => []];
        }

        if (! $this->connection->hasCredentials($integration)) {
            return [
                'ok' => false,
                'error' => $this->connection->authMode($integration) === 'service_account'
                    ? 'Paste a service-account JSON key, or switch to OAuth.'
                    : 'A Google OAuth client id, secret and refresh token are required.',
                'detail' => [],
            ];
        }

        $sites = $this->client->sites($integration);

        if (! $sites['ok']) {
            return ['ok' => false, 'error' => $sites['error'], 'detail' => ['http_status' => $sites['http_status']]];
        }

        if (! in_array($siteUrl, $sites['sites'], true)) {
            return [
                'ok' => false,
                'error' => 'Search Console does not list "'.$siteUrl.'" for this account. Visible properties: '
                    .($sites['sites'] === [] ? '(none)' : implode(', ', array_slice($sites['sites'], 0, 10)))
                    .'. Copy the property string exactly, and make sure the account is added as a user on it.',
                'detail' => ['visible_sites' => $sites['sites']],
            ];
        }

        return [
            'ok' => true,
            'error' => null,
            'detail' => [
                'site_url' => $siteUrl,
                'visible_sites' => $sites['sites'],
                'http_status' => $sites['http_status'],
            ],
        ];
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        $snapshot = $integration->settings['gsc_snapshot'] ?? null;

        return [
            'site_url' => (string) ($integration->credentials['site_url'] ?? ''),
            'auth_mode' => $this->connection->authMode($integration),
            'data_lag' => 'Search Console data lags two to three days behind reality.',
            'last_snapshot_at' => $snapshot['at'] ?? null,
        ];
    }
}
