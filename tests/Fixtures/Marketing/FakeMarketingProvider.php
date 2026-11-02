<?php

namespace Tests\Fixtures\Marketing;

use App\Domain\Marketing\Contracts\MarketingProvider;
use App\Domain\Marketing\MarketingIntegrationRegistry;
use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * A provider driver whose behaviour the test decides.
 *
 * It lives here rather than inline in a test class on purpose: Pint's
 * `php_unit_method_casing` rule snake-cases any method starting with "test" inside
 * a PHPUnit class, which would silently rename the interface's `testConnection`.
 */
class FakeMarketingProvider implements MarketingProvider
{
    public function __construct(
        protected string $provider = 'meta_conversions',
        protected bool $healthy = true,
        protected ?string $error = null,
    ) {}

    public function key(): string
    {
        return $this->provider;
    }

    public function label(): string
    {
        return MarketingIntegrationRegistry::label($this->provider);
    }

    public function capabilities(): array
    {
        return ['conversions', 'test_events'];
    }

    public function requiredCredentialKeys(): array
    {
        return MarketingIntegrationRegistry::requiredCredentialKeys($this->provider);
    }

    public function testConnection(MarketingIntegration $integration): array
    {
        return [
            'ok' => $this->healthy,
            'error' => $this->healthy ? null : ($this->error ?? 'The provider rejected the credentials.'),
            'detail' => ['checked' => true],
        ];
    }

    public function diagnostics(MarketingIntegration $integration): array
    {
        return ['provider' => $this->provider];
    }
}
