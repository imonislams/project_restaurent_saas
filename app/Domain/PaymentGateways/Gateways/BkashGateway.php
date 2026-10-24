<?php

namespace App\Domain\PaymentGateways\Gateways;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\Contracts\PlatformGateway;
use Illuminate\Support\Facades\Http;

/**
 * bKash (Bangladesh) platform driver — tokenized checkout: grant a token, create
 * a payment, redirect the customer to bKash, then execute to capture. State is
 * confirmed with the payment status API, never from the redirect alone.
 *
 * bKash has no dependable tokenized recurring billing for most merchant
 * accounts, so subscriptions renew via a fresh checkout (see RenewSubscriptions).
 */
class BkashGateway implements PlatformGateway
{
    public function name(): string
    {
        return 'bkash';
    }

    protected function base(PaymentGateway $config): string
    {
        return $config->environment->value === 'production'
            ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
            : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    }

    /** @return array{app_key: string, app_secret: string, username: string, password: string} */
    protected function credentials(PaymentGateway $config): array
    {
        $c = $config->credentials ?? [];

        return [
            'app_key' => (string) ($c['app_key'] ?? ''),
            'app_secret' => (string) ($c['app_secret'] ?? ''),
            'username' => (string) ($c['username'] ?? ''),
            'password' => (string) ($c['password'] ?? ''),
        ];
    }

    protected function token(PaymentGateway $config): ?string
    {
        $creds = $this->credentials($config);

        $response = Http::withHeaders([
            'username' => $creds['username'],
            'password' => $creds['password'],
            'Content-Type' => 'application/json',
        ])->timeout(20)->post($this->base($config).'/tokenized/checkout/token/grant', [
            'app_key' => $creds['app_key'],
            'app_secret' => $creds['app_secret'],
        ]);

        return $response->json('id_token');
    }

    public function createCheckout(PaymentGateway $config, array $payload): array
    {
        try {
            $token = $this->token($config);

            if (! $token) {
                return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => 'Token grant failed.']];
            }

            $data = Http::withToken($token)->timeout(20)->post($this->base($config).'/tokenized/checkout/create', [
                'mode' => '0011',
                'payerReference' => $payload['reference'] ?? '',
                'callbackURL' => $payload['callback_url'] ?? '',
                'amount' => number_format((float) ($payload['amount'] ?? 0), 2, '.', ''),
                'currency' => strtoupper((string) ($payload['currency'] ?? 'BDT')),
                'intent' => 'sale',
                'merchantInvoiceNumber' => $payload['reference'] ?? '',
            ])->json() ?? [];

            return [
                'status' => isset($data['paymentID']) ? 'pending' : 'failed',
                'reference' => $data['paymentID'] ?? null,
                'redirect_url' => $data['bkashURL'] ?? null,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyTransaction(PaymentGateway $config, string $reference): array
    {
        try {
            $token = $this->token($config);

            if (! $token) {
                return ['valid' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => []];
            }

            $data = Http::withToken($token)->timeout(20)
                ->post($this->base($config).'/tokenized/checkout/execute', ['paymentID' => $reference])->json() ?? [];

            $status = strtolower((string) ($data['transactionStatus'] ?? ''));

            // A retried notification may hit an already-executed payment; fall back
            // to the read-only status API to confirm.
            if (! in_array($status, ['completed', 'success'], true)) {
                $statusData = Http::withToken($token)->timeout(20)
                    ->post($this->base($config).'/tokenized/checkout/payment/status', ['paymentID' => $reference])->json() ?? [];

                $fallback = strtolower((string) ($statusData['transactionStatus'] ?? ''));

                if (in_array($fallback, ['completed', 'success'], true)) {
                    $data = $statusData;
                    $status = $fallback;
                }
            }

            return [
                'valid' => in_array($status, ['completed', 'success'], true),
                'status' => $status !== '' ? $status : null,
                'amount' => isset($data['amount']) ? (float) $data['amount'] : null,
                'currency' => isset($data['currency']) ? strtoupper((string) $data['currency']) : null,
                'reference' => $reference,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['valid' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyWebhook(PaymentGateway $config, array $payload, ?string $rawBody = null, array $headers = []): bool
    {
        // bKash callbacks are not signed; confirm via the execute/status API.
        return true;
    }

    public function refund(PaymentGateway $config, string $providerRef, float $amount, string $reason): array
    {
        try {
            $token = $this->token($config);

            if (! $token) {
                return ['status' => 'failed', 'reference' => null, 'raw' => []];
            }

            $data = Http::withToken($token)->timeout(20)->post($this->base($config).'/tokenized/checkout/payment/refund', [
                'paymentID' => $providerRef,
                'amount' => number_format($amount, 2, '.', ''),
                'trxID' => $reason,
            ])->json() ?? [];

            return [
                'status' => ($data['transactionStatus'] ?? '') === 'Completed' ? 'succeeded' : 'pending',
                'reference' => $data['refundTrxID'] ?? null,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function notificationReference(array $payload): ?string
    {
        return isset($payload['paymentID'])
            ? (string) $payload['paymentID']
            : (isset($payload['merchantInvoiceNumber']) ? (string) $payload['merchantInvoiceNumber'] : null);
    }

    public function notificationEventId(array $payload): ?string
    {
        foreach (['paymentID', 'trxID'] as $key) {
            if (! empty($payload[$key])) {
                return (string) $payload[$key];
            }
        }

        return null;
    }

    public function notificationEventType(array $payload): ?string
    {
        return isset($payload['transactionStatus'])
            ? (string) $payload['transactionStatus']
            : (isset($payload['status']) ? (string) $payload['status'] : null);
    }

    public function verificationId(array $payload): ?string
    {
        return isset($payload['paymentID']) ? (string) $payload['paymentID'] : null;
    }

    public function isSubscriptionEvent(array $payload): bool
    {
        return false;
    }

    public function testConnection(PaymentGateway $config): array
    {
        try {
            $token = $this->token($config);

            return $token
                ? ['ok' => true, 'error' => null]
                : ['ok' => false, 'error' => 'bKash rejected the credentials (no token returned).'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
