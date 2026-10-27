<?php

namespace App\Domain\PaymentGateways\Gateways;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\Contracts\PlatformGateway;
use Illuminate\Support\Facades\Http;

/**
 * SSLCommerz driver. Follows the provider's hosted-checkout + server-side
 * validation model: a browser redirect is never treated as proof of payment —
 * every transaction is validated with the provider's validation API.
 */
class SslCommerzGateway implements PlatformGateway
{
    public function name(): string
    {
        return 'sslcommerz';
    }

    /** @return array{process: string, validate: string} */
    protected function endpoints(PaymentGateway $config): array
    {
        return $config->environment->value === 'production'
            ? [
                'process' => 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
                'validate' => 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
            ]
            : [
                'process' => 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
                'validate' => 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
            ];
    }

    /** @return array{store_id: string, store_passwd: string} */
    protected function credentials(PaymentGateway $config): array
    {
        $credentials = $config->credentials ?? [];

        return [
            'store_id' => (string) ($credentials['store_id'] ?? ''),
            'store_passwd' => (string) ($credentials['store_password'] ?? ''),
        ];
    }

    public function createCheckout(PaymentGateway $config, array $payload): array
    {
        $body = array_merge($payload, $this->credentials($config));

        try {
            $response = Http::asForm()->timeout(20)->post($this->endpoints($config)['process'], $body);
            $data = $response->json();
            $data = is_array($data) ? $data : [];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => $e->getMessage()]];
        }

        $url = $data['GatewayPageURL'] ?? null;

        return [
            'status' => $url ? 'pending' : 'failed',
            'reference' => $payload['tran_id'] ?? null,
            'redirect_url' => $url,
            'raw' => $data,
        ];
    }

    public function verifyTransaction(PaymentGateway $config, string $valId): array
    {
        $credentials = $this->credentials($config);

        try {
            $response = Http::timeout(20)->get($this->endpoints($config)['validate'], [
                'val_id' => $valId,
                'store_id' => $credentials['store_id'],
                'store_passwd' => $credentials['store_passwd'],
                'format' => 'json',
            ]);

            $data = $response->json();
            $data = is_array($data) ? $data : [];
        } catch (\Throwable $e) {
            return ['valid' => false, 'reachable' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => null, 'raw' => ['error' => $e->getMessage()]];
        }

        $status = strtoupper((string) ($data['status'] ?? ''));

        // SSLCommerz settles in BDT: `amount`/`currency` are the converted figures,
        // while `currency_amount`/`currency_type` carry what the merchant asked for.
        // Comparing the converted figures would fail every non-BDT payment.
        $amount = $data['currency_amount'] ?? $data['amount'] ?? null;
        $currency = $data['currency_type'] ?? $data['currency'] ?? null;

        return [
            'valid' => in_array($status, ['VALID', 'VALIDATED'], true),
            // A 404, an HTML error page or an empty body means we could not ask the
            // gateway — not that the transaction is bad. The caller keeps the
            // payment pending in that case instead of failing a real payment.
            'reachable' => $response->successful() && $status !== '',
            'status' => $status !== '' ? $status : null,
            'amount' => is_numeric($amount) ? (float) $amount : null,
            'currency' => is_string($currency) && $currency !== '' ? strtoupper($currency) : null,
            'reference' => isset($data['tran_id']) ? (string) $data['tran_id'] : null,
            'raw' => $data,
        ];
    }

    public function verifyWebhook(PaymentGateway $config, array $payload, ?string $rawBody = null, array $headers = []): bool
    {
        // SSLCommerz IPNs are not HMAC-signed; authenticity is established by
        // validating the transaction server-side (verifyTransaction).
        return true;
    }

    public function refund(PaymentGateway $config, string $providerRef, float $amount, string $reason): array
    {
        return [
            'status' => 'pending',
            'reference' => null,
            'raw' => ['note' => 'SSLCommerz refunds are issued from the merchant panel; recorded for manual processing.'],
        ];
    }

    public function notificationReference(array $payload): ?string
    {
        return isset($payload['tran_id']) ? (string) $payload['tran_id'] : null;
    }

    public function notificationEventId(array $payload): ?string
    {
        $id = $payload['val_id'] ?? $payload['bank_tran_id'] ?? $payload['tran_id'] ?? null;

        return $id !== null ? (string) $id : null;
    }

    public function notificationEventType(array $payload): ?string
    {
        return isset($payload['status']) ? (string) $payload['status'] : null;
    }

    public function verificationId(array $payload): ?string
    {
        return isset($payload['val_id']) ? (string) $payload['val_id'] : null;
    }

    public function isSubscriptionEvent(array $payload): bool
    {
        return false;
    }

    public function testConnection(PaymentGateway $config): array
    {
        // SSLCommerz has no cheap credential endpoint; validate the stored set.
        $credentials = $this->credentials($config);

        if ($credentials['store_id'] === '' || $credentials['store_passwd'] === '') {
            return ['ok' => false, 'error' => 'Store ID and store password are required.'];
        }

        return ['ok' => true, 'error' => null];
    }
}
