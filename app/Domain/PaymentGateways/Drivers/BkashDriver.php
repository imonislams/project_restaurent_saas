<?php

namespace App\Domain\PaymentGateways\Drivers;

use App\Domain\PaymentGateways\Contracts\GatewayDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use Illuminate\Support\Facades\Http;

/**
 * bKash driver (Bangladesh) — tokenized checkout: grant a token, create a
 * payment, redirect the customer, then execute to capture. State is confirmed
 * with the payment status API, never from the redirect alone.
 */
class BkashDriver implements GatewayDriver
{
    public function name(): string
    {
        return 'bkash';
    }

    protected function base(TenantGateway $config): string
    {
        return $config->environment === 'production'
            ? 'https://tokenized.pay.bka.sh/v1.2.0-beta'
            : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    }

    protected function credentials(TenantGateway $config): array
    {
        $c = $config->credentials ?? [];

        return [
            'app_key' => (string) ($c['app_key'] ?? ''),
            'app_secret' => (string) ($c['app_secret'] ?? ''),
            'username' => (string) ($c['username'] ?? ''),
            'password' => (string) ($c['password'] ?? ''),
        ];
    }

    protected function token(TenantGateway $config): ?string
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

    public function createCheckout(TenantGateway $config, array $payload): array
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

    public function verifyTransaction(TenantGateway $config, string $reference): array
    {
        try {
            $token = $this->token($config);

            if (! $token) {
                return ['valid' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => []];
            }

            $data = Http::withToken($token)->timeout(20)->post($this->base($config).'/tokenized/checkout/execute', ['paymentID' => $reference])->json() ?? [];

            $status = strtolower((string) ($data['transactionStatus'] ?? ''));

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

    public function verifyWebhook(TenantGateway $config, array $payload, ?string $signature): bool
    {
        // bKash callbacks are not signed; confirm via the execute/status API.
        return true;
    }

    public function refund(TenantGateway $config, string $providerRef, float $amount, string $reason): array
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

            return ['status' => ($data['transactionStatus'] ?? '') === 'Completed' ? 'succeeded' : 'pending', 'reference' => $data['refundTrxID'] ?? null, 'raw' => $data];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }
}
