<?php

namespace App\Domain\Marketing\Contracts;

use App\Domain\Marketing\Models\MarketingIntegration;

/**
 * The provider SPI. Every external marketing integration implements this so a new
 * ad network, analytics vendor or email provider can be added without touching core
 * logic — mirroring the existing PlatformGateway contract.
 */
interface MarketingProvider
{
    /** Stable registry key, e.g. `meta_conversions`. */
    public function key(): string;

    /** Human label for the integrations screen. */
    public function label(): string;

    /**
     * Capability flags this driver actually supports.
     *
     * @return list<string> e.g. ['pixel', 'conversions', 'sync', 'test_events']
     */
    public function capabilities(): array;

    /**
     * Credential keys without which the provider cannot work.
     *
     * @return list<string>
     */
    public function requiredCredentialKeys(): array;

    /**
     * Prove the connection really works. Must never report success from the mere
     * presence of credentials.
     *
     * @return array{ok: bool, error: ?string, detail: array<string, mixed>}
     */
    public function testConnection(MarketingIntegration $integration): array;

    /**
     * Non-secret diagnostics for the UI.
     *
     * @return array<string, mixed>
     */
    public function diagnostics(MarketingIntegration $integration): array;
}
