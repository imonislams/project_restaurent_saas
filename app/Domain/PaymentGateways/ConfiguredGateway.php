<?php

namespace App\Domain\PaymentGateways;

use App\Domain\PaymentGateways\Contracts\GatewayDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\Payments\Contracts\PaymentGateway;

/**
 * Adapts a configured tenant gateway (driver + stored config) to the sale/QR
 * payment contract. `charge()` returns a checkout status and, for hosted
 * gateways, a redirect URL the customer must complete.
 */
class ConfiguredGateway implements PaymentGateway
{
    public function __construct(
        protected GatewayDriver $driver,
        protected TenantGateway $config,
    ) {}

    public function name(): string
    {
        return $this->config->provider;
    }

    public function charge(array $intent): array
    {
        $result = $this->driver->createCheckout($this->config, $intent);

        return [
            'status' => $result['status'] ?? 'pending',
            'reference' => $result['reference'] ?? null,
            'redirect_url' => $result['redirect_url'] ?? null,
            'raw' => $result['raw'] ?? [],
        ];
    }

    public function verifyWebhook(string $payload, ?string $signature): bool
    {
        $data = json_decode($payload, true);
        $data = is_array($data) ? $data : [];
        $data['__raw'] = $payload;

        return $this->driver->verifyWebhook($this->config, $data, $signature);
    }
}
