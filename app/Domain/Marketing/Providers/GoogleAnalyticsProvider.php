<?php

namespace App\Domain\Marketing\Providers;

use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\Google\GoogleAnalyticsClient;
use App\Domain\Marketing\Google\GoogleConnection;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * Google Analytics 4.
 *
 * Reporting is read-only API data; the browser tag is what actually collects
 * visits. The connection test therefore proves API access to the named property
 * rather than claiming anything about what the tag has collected.
 */
class GoogleAnalyticsProvider implements MarketingProvider
{
    public function __construct(
        protected GoogleConnection $connection,
        protected GoogleAnalyticsClient $client,
    ) {}

    public function key(): string
    {
        return 'google_analytics';
    }

    public function label(): string
    {
        return 'Google Analytics 4';
    }

    public function capabilities(): array
    {
        return ['sync', 'property_selection'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->key());
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        if (! $this->connection->hasCredentials($integration)) {
            return [
                'ok' => false,
                'error' => $this->connection->authMode($integration) === 'service_account'
                    ? 'Paste a service-account JSON key, or switch to OAuth.'
                    : 'A Google OAuth client id, secret and refresh token are required. Use Connect with Google, or paste the credentials.',
                'detail' => [],
            ];
        }

        // A one-day report with a single metric is the cheapest real proof that the
        // token works *and* that this property is readable.
        $result = $this->client->runReport(
            $integration,
            'yesterday',
            'today',
            [['name' => 'activeUsers']],
        );

        if (! $result['ok']) {
            return ['ok' => false, 'error' => $result['error'], 'detail' => ['http_status' => $result['http_status']]];
        }

        return [
            'ok' => true,
            'error' => null,
            'detail' => [
                'property_id' => $this->client->propertyId($integration),
                'auth_mode' => $this->connection->authMode($integration),
                'http_status' => $result['http_status'],
            ],
        ];
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        $snapshot = $integration->settings['ga4_snapshot'] ?? null;

        return [
            'property_id' => $this->client->propertyId($integration),
            'auth_mode' => $this->connection->authMode($integration),
            'measurement_id' => (string) ($integration->credentials['measurement_id'] ?? ''),
            'list_properties' => 'Set property_id to `properties/123456789` or just `123456789`.',
            'last_snapshot_at' => $snapshot['at'] ?? null,
        ];
    }
}
