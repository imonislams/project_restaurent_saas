<?php

namespace App\Domain\Marketing\Providers;

use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\Google\GoogleAdsClient;
use App\Domain\Marketing\Google\GoogleConnection;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * Google Ads.
 *
 * Two separate capabilities, with very different setup costs:
 *
 *  1. **Conversion tracking** — a conversion id and label emitted through the tag
 *     layer. Needs no developer token and no server API.
 *  2. **Spend sync** — needs a developer token that Google issues only after
 *     review. Until then spend stays manual, and every figure derived from it says
 *     so rather than pretending to be live ad data.
 */
class GoogleAdsProvider implements MarketingProvider
{
    public function __construct(
        protected GoogleConnection $connection,
        protected GoogleAdsClient $client,
    ) {}

    public function key(): string
    {
        return 'google_ads';
    }

    public function label(): string
    {
        return 'Google Ads';
    }

    public function capabilities(): array
    {
        return ['conversion_tracking', 'spend_sync'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->key());
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        if (! $this->client->hasDeveloperToken($integration)) {
            $conversionId = trim((string) ($integration->credentials['conversion_id'] ?? ''));

            return [
                'ok' => false,
                'error' => $conversionId === ''
                    ? 'Add a conversion id to start tracking conversions. Spend sync additionally needs a developer token, which Google issues after review.'
                    : 'Conversion tracking is configured for '.$conversionId.', but spend sync cannot be verified without a developer token. Spend stays manual until one is supplied.',
                'detail' => [
                    'conversion_tracking' => $conversionId !== '',
                    'spend_sync' => false,
                ],
            ];
        }

        return $this->client->testConnection($integration);
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        $snapshot = $integration->settings['ads_snapshot'] ?? null;

        return [
            'conversion_id' => (string) ($integration->credentials['conversion_id'] ?? ''),
            'conversion_label' => (string) ($integration->credentials['conversion_label'] ?? ''),
            'developer_token_present' => $this->client->hasDeveloperToken($integration),
            'customer_id' => $this->client->customerId($integration),
            'spend_source' => $this->client->hasDeveloperToken($integration) ? 'Google Ads API' : 'manual entry only',
            'last_snapshot_at' => $snapshot['at'] ?? null,
        ];
    }
}
