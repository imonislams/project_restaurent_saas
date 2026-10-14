<?php

namespace App\Domain\PaymentGateways\Contracts;

use App\Domain\PaymentGateways\Models\TenantGateway;

/**
 * A tenant-facing payment driver. Cash settles at the till; hosted gateways
 * create a checkout the customer completes and are only marked paid once the
 * provider is verified server-side.
 */
interface GatewayDriver
{
    public function name(): string;

    /**
     * @param  array<string, mixed>  $payload
     * @return array{status: string, reference: ?string, redirect_url: ?string, raw: array}
     */
    public function createCheckout(TenantGateway $config, array $payload): array;

    /**
     * Verify a completed transaction with the provider.
     *
     * @return array{valid: bool, status: ?string, amount: ?float, currency: ?string, reference: ?string, raw: array}
     */
    public function verifyTransaction(TenantGateway $config, string $reference): array;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function verifyWebhook(TenantGateway $config, array $payload, ?string $signature): bool;

    public function refund(TenantGateway $config, string $providerRef, float $amount, string $reason): array;
}
