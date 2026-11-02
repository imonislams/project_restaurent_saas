<?php

namespace App\Domain\Marketing\Providers;

use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * Google Tag Manager container.
 *
 * The container id is public (`GTM-XXXXXX`) and the tag is emitted by the browser,
 * so there is nothing to authenticate server-side. What can be checked — and what
 * most often goes wrong — is that exactly one container is installed.
 */
class GoogleTagManagerProvider implements MarketingProvider
{
    public function key(): string
    {
        return 'google_tag_manager';
    }

    public function label(): string
    {
        return 'Google Tag Manager';
    }

    public function capabilities(): array
    {
        return ['container', 'consent_mode'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->key());
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        $containerId = strtoupper(trim((string) ($integration->credentials['container_id'] ?? '')));

        if (preg_match('/^GTM-[A-Z0-9]{4,12}$/', $containerId) !== 1) {
            return [
                'ok' => false,
                'error' => 'A GTM container id looks like GTM-ABC123. "'.($containerId === '' ? '(empty)' : $containerId).'" is not one.',
                'detail' => [],
            ];
        }

        $duplicates = $this->otherContainers($integration);

        if ($duplicates !== []) {
            return [
                'ok' => false,
                'error' => 'Another GTM container is already configured ('.implode(', ', $duplicates).'). Two containers on one site double-count every visit, so only one may be installed.',
                'detail' => ['conflicting_containers' => $duplicates],
            ];
        }

        return [
            'ok' => true,
            'error' => null,
            'detail' => [
                'container_id' => $containerId,
                'verified_by' => 'format_and_uniqueness',
                'note' => 'The container is well formed and it is the only one configured. Confirm that tags fire in Tag Assistant — this check makes no network call.',
            ],
        ];
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        return [
            'container_id' => strtoupper(trim((string) ($integration->credentials['container_id'] ?? ''))),
            'consent_mode' => 'A denied default for analytics_storage and ad_storage is emitted before the container loads.',
            'other_containers' => $this->otherContainers($integration),
        ];
    }

    /**
     * Container ids configured on any other GTM integration row.
     *
     * @return list<string>
     */
    protected function otherContainers(MarketingIntegration $integration): array
    {
        return MarketingIntegration::query()
            ->where('provider', $this->key())
            ->whereKeyNot($integration->getKey())
            ->get()
            ->map(fn (MarketingIntegration $other) => strtoupper(trim((string) ($other->credentials['container_id'] ?? ''))))
            ->filter(fn (string $id) => $id !== '')
            ->unique()
            ->values()
            ->all();
    }
}
