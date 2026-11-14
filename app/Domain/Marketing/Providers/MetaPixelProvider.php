<?php

namespace App\Domain\Marketing\Providers;

use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * The browser-side Meta Pixel.
 *
 * There is nothing to authenticate against server-side: a pixel id is a public
 * identifier and its only real proof is a live page view observed in Events
 * Manager. The connection test therefore validates the format and says plainly
 * that the live check happens in the browser — it does not claim a network
 * round-trip it never made.
 */
class MetaPixelProvider implements MarketingProvider
{
    public function key(): string
    {
        return 'meta_pixel';
    }

    public function label(): string
    {
        return 'Meta Pixel';
    }

    public function capabilities(): array
    {
        return ['pixel'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->key());
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        $pixelId = (string) ($integration->credentials['pixel_id'] ?? '');

        if (preg_match('/^[0-9]{5,20}$/', $pixelId) !== 1) {
            return [
                'ok' => false,
                'error' => 'A Meta Pixel ID is 5 to 20 digits. "'.($pixelId === '' ? '(empty)' : $pixelId).'" is not a valid one.',
                'detail' => [],
            ];
        }

        return [
            'ok' => true,
            'error' => null,
            'detail' => [
                'pixel_id' => $pixelId,
                'verified_by' => 'format',
                'note' => 'The pixel id is valid, so the tag will render on consenting visits. Confirm real traffic in Events Manager — this check makes no network call.',
            ],
        ];
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        return [
            'pixel_id' => (string) ($integration->credentials['pixel_id'] ?? ''),
            'tracked_events' => $integration->settings['events'] ?? [],
            'client_side_only' => true,
        ];
    }
}
