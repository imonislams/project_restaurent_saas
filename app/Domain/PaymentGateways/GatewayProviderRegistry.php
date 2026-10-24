<?php

namespace App\Domain\PaymentGateways;

/**
 * Describes every platform (SaaS subscription) payment provider: its label, the
 * credentials it needs, its capabilities, and whether it supports native
 * recurring billing. The registry is the single source of truth for the
 * configuration UI and for credential validation.
 */
class GatewayProviderRegistry
{
    /**
     * @var array<string, array{
     *     label: string,
     *     capabilities: list<string>,
     *     recurring: bool,
     *     price_mapping: bool,
     *     credential_fields: list<array{key: string, label: string, secret: bool, optional?: bool}>
     * }>
     */
    public const SCHEMA = [
        'manual' => [
            'label' => 'Manual (offline)',
            'capabilities' => [],
            'recurring' => false,
            'price_mapping' => false,
            'credential_fields' => [],
        ],
        'sslcommerz' => [
            'label' => 'SSLCommerz (Bangladesh)',
            'capabilities' => ['hosted_checkout'],
            'recurring' => false,
            'price_mapping' => false,
            'credential_fields' => [
                ['key' => 'store_id', 'label' => 'Store ID', 'secret' => false],
                ['key' => 'store_password', 'label' => 'Store password', 'secret' => true],
            ],
        ],
        'bkash' => [
            'label' => 'bKash (Bangladesh)',
            'capabilities' => ['hosted_checkout', 'mobile_wallet', 'refund'],
            'recurring' => false,
            'price_mapping' => false,
            'credential_fields' => [
                ['key' => 'app_key', 'label' => 'App key', 'secret' => false],
                ['key' => 'app_secret', 'label' => 'App secret', 'secret' => true],
                ['key' => 'username', 'label' => 'Username', 'secret' => false],
                ['key' => 'password', 'label' => 'Password', 'secret' => true],
            ],
        ],
        'paddle' => [
            'label' => 'Paddle (international)',
            'capabilities' => ['hosted_checkout', 'card', 'recurring', 'refund'],
            'recurring' => true,
            'price_mapping' => true,
            'credential_fields' => [
                ['key' => 'api_key', 'label' => 'API key', 'secret' => true],
                ['key' => 'webhook_secret', 'label' => 'Webhook signing secret', 'secret' => true],
                ['key' => 'client_side_token', 'label' => 'Client-side token', 'secret' => false, 'optional' => true],
                ['key' => 'seller_id', 'label' => 'Seller / vendor ID', 'secret' => false, 'optional' => true],
            ],
        ],
    ];

    /** @return list<string> */
    public function providers(): array
    {
        return array_keys(self::SCHEMA);
    }

    /** @return array<string, array<string, mixed>> */
    public function schema(): array
    {
        return self::SCHEMA;
    }

    /** @return array<string, mixed> */
    public function meta(string $provider): array
    {
        return self::SCHEMA[$provider] ?? [
            'label' => ucfirst($provider),
            'capabilities' => [],
            'recurring' => false,
            'price_mapping' => false,
            'credential_fields' => [],
        ];
    }

    public function label(string $provider): string
    {
        return (string) $this->meta($provider)['label'];
    }

    /** @return list<array{key: string, label: string, secret: bool, optional?: bool}> */
    public function credentialFields(string $provider): array
    {
        return $this->meta($provider)['credential_fields'];
    }

    /** Credential keys a configuration must have to be usable. @return list<string> */
    public function requiredCredentialKeys(string $provider): array
    {
        return collect($this->credentialFields($provider))
            ->reject(fn (array $field) => $field['optional'] ?? false)
            ->pluck('key')
            ->all();
    }

    /** @return list<string> */
    public function capabilities(string $provider): array
    {
        return $this->meta($provider)['capabilities'];
    }

    public function supportsRecurring(string $provider): bool
    {
        return (bool) $this->meta($provider)['recurring'];
    }

    /** Providers whose plan prices are mapped to provider product/price ids. */
    public function supportsPriceMapping(string $provider): bool
    {
        return (bool) ($this->meta($provider)['price_mapping'] ?? false);
    }

    /** @return list<string> */
    public function priceProviders(): array
    {
        return array_values(array_filter($this->providers(), fn (string $provider) => $this->supportsPriceMapping($provider)));
    }

    /**
     * Capability options offered when configuring a gateway's availability.
     *
     * @return list<array{value: string, label: string}>
     */
    public function capabilityOptions(): array
    {
        return [
            ['value' => 'card', 'label' => 'Card'],
            ['value' => 'mobile_wallet', 'label' => 'Mobile wallet'],
            ['value' => 'bank', 'label' => 'Bank transfer'],
            ['value' => 'hosted_checkout', 'label' => 'Hosted checkout'],
            ['value' => 'recurring', 'label' => 'Recurring billing'],
            ['value' => 'refund', 'label' => 'Refunds'],
        ];
    }
}
