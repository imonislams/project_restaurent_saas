<?php

namespace App\Domain\Payments\Gateways;

use App\Domain\Payments\Contracts\PaymentGateway;

/**
 * Default provider: payments are recorded as succeeded at the till (cash,
 * manual card terminal, etc.) with no external call.
 */
class ManualGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'manual';
    }

    public function charge(array $intent): array
    {
        return ['status' => 'succeeded', 'reference' => null];
    }

    public function verifyWebhook(string $payload, ?string $signature): bool
    {
        // Manual provider does not send webhooks.
        return true;
    }
}
