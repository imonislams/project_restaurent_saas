<?php

namespace App\Domain\Payments\Contracts;

/**
 * Payment provider abstraction. Real gateways implement this with idempotent
 * charge requests and signed webhook verification; the core sale flow never
 * assumes a provider is reachable.
 */
interface PaymentGateway
{
    public function name(): string;

    /**
     * @param  array<string, mixed>  $intent
     * @return array{status: string, reference: ?string}
     */
    public function charge(array $intent): array;

    /**
     * Verify the provider's webhook signature over the raw payload.
     */
    public function verifyWebhook(string $payload, ?string $signature): bool;
}
