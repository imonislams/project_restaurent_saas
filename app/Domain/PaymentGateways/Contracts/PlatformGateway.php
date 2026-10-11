<?php

namespace App\Domain\PaymentGateways\Contracts;

use App\Domain\Billing\Models\PaymentGateway;

/**
 * A platform payment gateway driver. Implementations talk to the provider; they
 * must never trust a browser redirect as proof of payment — success is only
 * declared after server-side verification.
 */
interface PlatformGateway
{
    public function name(): string;

    /**
     * Initiate a checkout session with the provider.
     *
     * @param  array<string, mixed>  $payload
     * @return array{status: string, reference: ?string, redirect_url: ?string, raw: array<string, mixed>}
     */
    public function createCheckout(PaymentGateway $config, array $payload): array;

    /**
     * Verify a transaction server-side using the provider's validation API.
     *
     * @return array{valid: bool, status: ?string, amount: ?float, currency: ?string, reference: ?string, raw: array<string, mixed>}
     */
    public function verifyTransaction(PaymentGateway $config, string $valId): array;

    /**
     * Whether an incoming webhook is authentic. For providers without a
     * signature this returns true and authenticity rests on verifyTransaction().
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyWebhook(PaymentGateway $config, array $payload): bool;

    /**
     * Request a refund. Providers without an API return a pending result for
     * manual processing.
     *
     * @return array{status: string, reference: ?string, raw: array<string, mixed>}
     */
    public function refund(PaymentGateway $config, string $providerRef, float $amount, string $reason): array;
}
