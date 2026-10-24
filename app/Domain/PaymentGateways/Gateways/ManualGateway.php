<?php

namespace App\Domain\PaymentGateways\Gateways;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\Contracts\PlatformGateway;

/**
 * Default gateway. No external provider: payments are recorded and settled
 * manually by a platform administrator.
 */
class ManualGateway implements PlatformGateway
{
    public function name(): string
    {
        return 'manual';
    }

    public function createCheckout(PaymentGateway $config, array $payload): array
    {
        return [
            'status' => 'pending',
            'reference' => $payload['reference'] ?? null,
            'redirect_url' => null,
            'raw' => ['note' => 'Manual gateway — settle the payment from the payments screen.'],
        ];
    }

    public function verifyTransaction(PaymentGateway $config, string $valId): array
    {
        return [
            'valid' => false,
            'status' => null,
            'amount' => null,
            'currency' => null,
            'reference' => null,
            'raw' => ['note' => 'The manual gateway has no verification API.'],
        ];
    }

    public function verifyWebhook(PaymentGateway $config, array $payload, ?string $rawBody = null, array $headers = []): bool
    {
        return true;
    }

    public function refund(PaymentGateway $config, string $providerRef, float $amount, string $reason): array
    {
        return ['status' => 'pending', 'reference' => null, 'raw' => ['note' => 'Manual refund recorded for processing.']];
    }

    public function notificationReference(array $payload): ?string
    {
        return isset($payload['reference']) ? (string) $payload['reference'] : null;
    }

    public function notificationEventId(array $payload): ?string
    {
        return $this->notificationReference($payload);
    }

    public function notificationEventType(array $payload): ?string
    {
        return isset($payload['status']) ? (string) $payload['status'] : null;
    }

    public function verificationId(array $payload): ?string
    {
        return null;
    }

    public function isSubscriptionEvent(array $payload): bool
    {
        return false;
    }

    public function testConnection(PaymentGateway $config): array
    {
        return ['ok' => true, 'error' => null];
    }
}
