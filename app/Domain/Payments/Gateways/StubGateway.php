<?php

namespace App\Domain\Payments\Gateways;

use App\Domain\Payments\Contracts\PaymentGateway;
use Illuminate\Support\Str;

/**
 * External provider stub: returns a pending payment with a reference that is
 * later confirmed by a signed webhook. Used to exercise the asynchronous,
 * webhook-verified flow without a real gateway.
 */
class StubGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'stub';
    }

    public function charge(array $intent): array
    {
        return ['status' => 'pending', 'reference' => 'STUB-'.Str::upper(Str::random(12))];
    }

    public function verifyWebhook(string $payload, ?string $signature): bool
    {
        if (! $signature) {
            return false;
        }

        $secret = (string) config('services.payments.stub_secret');

        return hash_equals(hash_hmac('sha256', $payload, $secret), $signature);
    }
}
