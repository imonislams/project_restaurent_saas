<?php

namespace App\Domain\PaymentGateways\Gateways;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\Contracts\PlatformGateway;
use Illuminate\Support\Facades\Http;

/**
 * Paddle Billing (API v2) driver. Creates a hosted checkout transaction for the
 * mapped plan price and confirms payment by reading the transaction back from
 * Paddle's API. Webhooks are authenticated with the Paddle-Signature HMAC.
 *
 * Paddle is the native recurring gateway: subscription lifecycle changes arrive
 * as `subscription.*` webhooks and are applied by SubscriptionSyncService.
 */
class PaddleGateway implements PlatformGateway
{
    public function name(): string
    {
        return 'paddle';
    }

    protected function base(PaymentGateway $config): string
    {
        return $config->environment->value === 'production'
            ? 'https://api.paddle.com'
            : 'https://sandbox-api.paddle.com';
    }

    protected function credentials(PaymentGateway $config): array
    {
        $c = $config->credentials ?? [];

        return [
            'api_key' => (string) ($c['api_key'] ?? ''),
            'webhook_secret' => (string) ($c['webhook_secret'] ?? ''),
        ];
    }

    /** @return array<string, string> */
    protected function headers(PaymentGateway $config): array
    {
        return [
            'Authorization' => 'Bearer '.$this->credentials($config)['api_key'],
            'Content-Type' => 'application/json',
        ];
    }

    public function createCheckout(PaymentGateway $config, array $payload): array
    {
        $priceId = (string) ($payload['price_id'] ?? '');

        if ($priceId === '') {
            return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => 'No Paddle price configured for this plan.']];
        }

        $body = [
            'items' => [['price_id' => $priceId, 'quantity' => 1]],
            'collection_mode' => 'automatic',
            'custom_data' => array_filter([
                'reference' => $payload['reference'] ?? null,
                'invoice' => $payload['invoice_number'] ?? null,
                'tenant_id' => $payload['tenant_id'] ?? null,
            ], fn ($value) => $value !== null),
        ];

        try {
            $response = Http::withHeaders($this->headers($config))->timeout(20)
                ->post($this->base($config).'/transactions', $body);

            $data = $response->json();
            $data = is_array($data) ? $data : [];

            $transaction = $data['data'] ?? [];
            $url = $transaction['checkout']['url'] ?? null;

            return [
                'status' => $url ? 'pending' : 'failed',
                'reference' => $transaction['id'] ?? ($payload['reference'] ?? null),
                'redirect_url' => $url,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyTransaction(PaymentGateway $config, string $transactionId): array
    {
        try {
            $response = Http::withHeaders($this->headers($config))->timeout(20)
                ->get($this->base($config).'/transactions/'.$transactionId);

            $data = $response->json();
            $data = is_array($data) ? $data : [];

            $transaction = $data['data'] ?? [];
            $status = strtolower((string) ($transaction['status'] ?? ''));
            $grandTotal = data_get($transaction, 'details.totals.grand_total');

            return [
                'valid' => in_array($status, ['completed', 'billed', 'paid'], true),
                'status' => $status !== '' ? $status : null,
                'amount' => $grandTotal !== null ? round(((float) $grandTotal) / 100, 2) : null,
                'currency' => isset($transaction['currency_code']) ? strtoupper((string) $transaction['currency_code']) : null,
                'reference' => $transaction['id'] ?? $transactionId,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['valid' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => $transactionId, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyWebhook(PaymentGateway $config, array $payload, ?string $rawBody = null, array $headers = []): bool
    {
        $secret = $this->credentials($config)['webhook_secret'];

        if ($secret === '' || $rawBody === null) {
            return false;
        }

        $signature = $headers['paddle-signature'] ?? null;

        if (! $signature) {
            return false;
        }

        // Paddle-Signature: ts=1234567890;h1=hexdigest
        $parts = [];
        foreach (explode(';', $signature) as $segment) {
            if (str_contains($segment, '=')) {
                [$key, $value] = explode('=', $segment, 2);
                $parts[trim($key)] = trim($value);
            }
        }

        $ts = $parts['ts'] ?? null;
        $h1 = $parts['h1'] ?? null;

        if (! $ts || ! $h1) {
            return false;
        }

        $expected = hash_hmac('sha256', $ts.':'.$rawBody, $secret);

        return hash_equals($expected, $h1);
    }

    public function refund(PaymentGateway $config, string $providerRef, float $amount, string $reason): array
    {
        try {
            $response = Http::withHeaders($this->headers($config))->timeout(20)
                ->post($this->base($config).'/adjustments', [
                    'action' => 'refund',
                    'transaction_id' => $providerRef,
                    'reason' => $reason,
                    'items' => [['type' => 'full']],
                ]);

            $data = $response->json();
            $data = is_array($data) ? $data : [];

            $status = strtolower((string) data_get($data, 'data.status', ''));

            return [
                'status' => $status === 'approved' ? 'succeeded' : 'pending',
                'reference' => data_get($data, 'data.id'),
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'pending', 'reference' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function notificationReference(array $payload): ?string
    {
        return data_get($payload, 'data.custom_data.reference')
            ?? (isset($payload['data']['id']) ? (string) $payload['data']['id'] : null);
    }

    public function notificationEventId(array $payload): ?string
    {
        return isset($payload['event_id']) ? (string) $payload['event_id'] : null;
    }

    public function notificationEventType(array $payload): ?string
    {
        return isset($payload['event_type']) ? (string) $payload['event_type'] : null;
    }

    public function verificationId(array $payload): ?string
    {
        return isset($payload['data']['id']) ? (string) $payload['data']['id'] : null;
    }

    public function isSubscriptionEvent(array $payload): bool
    {
        $type = $this->notificationEventType($payload);

        return $type !== null && str_starts_with($type, 'subscription.');
    }

    public function testConnection(PaymentGateway $config): array
    {
        if ($this->credentials($config)['api_key'] === '') {
            return ['ok' => false, 'error' => 'An API key is required.'];
        }

        try {
            $response = Http::withHeaders($this->headers($config))->timeout(20)
                ->get($this->base($config).'/prices', ['per_page' => 1]);

            return $response->successful()
                ? ['ok' => true, 'error' => null]
                : ['ok' => false, 'error' => 'Paddle rejected the API key (HTTP '.$response->status().').'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
