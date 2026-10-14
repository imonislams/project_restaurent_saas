<?php

namespace App\Domain\PaymentGateways\Drivers;

use App\Domain\PaymentGateways\Contracts\GatewayDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;

/**
 * Cash is collected physically at the till; there is no external call.
 */
class CashDriver implements GatewayDriver
{
    public function name(): string
    {
        return 'cash';
    }

    public function createCheckout(TenantGateway $config, array $payload): array
    {
        return ['status' => 'succeeded', 'reference' => null, 'redirect_url' => null, 'raw' => []];
    }

    public function verifyTransaction(TenantGateway $config, string $reference): array
    {
        return ['valid' => true, 'status' => 'succeeded', 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => []];
    }

    public function verifyWebhook(TenantGateway $config, array $payload, ?string $signature): bool
    {
        return true;
    }

    public function refund(TenantGateway $config, string $providerRef, float $amount, string $reason): array
    {
        return ['status' => 'succeeded', 'reference' => null, 'raw' => []];
    }
}
