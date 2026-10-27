<?php

namespace App\Domain\PaymentGateways\Drivers;

use App\Domain\PaymentGateways\Contracts\GatewayDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use Illuminate\Support\Facades\Http;

/**
 * SSLCommerz driver (Bangladesh). Hosted checkout + server-side validation API.
 */
class SslCommerzDriver implements GatewayDriver
{
    public function name(): string
    {
        return 'sslcommerz';
    }

    /** @return array{process: string, validate: string} */
    protected function endpoints(TenantGateway $config): array
    {
        return $config->environment === 'production'
            ? ['process' => 'https://securepay.sslcommerz.com/gwprocess/v4/api.php', 'validate' => 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php']
            : ['process' => 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php', 'validate' => 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'];
    }

    /** @return array{store_id: string, store_passwd: string} */
    protected function credentials(TenantGateway $config): array
    {
        $credentials = $config->credentials ?? [];

        return [
            'store_id' => (string) ($credentials['store_id'] ?? ''),
            'store_passwd' => (string) ($credentials['store_password'] ?? ''),
        ];
    }

    public function createCheckout(TenantGateway $config, array $payload): array
    {
        $body = array_merge($payload, $this->credentials($config));

        try {
            $data = Http::asForm()->timeout(20)->post($this->endpoints($config)['process'], $body)->json() ?? [];
            $url = $data['GatewayPageURL'] ?? null;

            return [
                'status' => $url ? 'pending' : 'failed',
                'reference' => $payload['tran_id'] ?? null,
                'redirect_url' => $url,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyTransaction(TenantGateway $config, string $reference): array
    {
        $credentials = $this->credentials($config);

        try {
            $data = Http::timeout(20)->get($this->endpoints($config)['validate'], [
                'val_id' => $reference,
                'store_id' => $credentials['store_id'],
                'store_passwd' => $credentials['store_passwd'],
                'format' => 'json',
            ])->json() ?? [];

            $status = strtoupper((string) ($data['status'] ?? ''));

            // SSLCommerz settles in BDT: `amount`/`currency` are the converted
            // figures, while `currency_amount`/`currency_type` carry what the
            // merchant asked for. Comparing the converted figures would fail every
            // non-BDT payment.
            $amount = $data['currency_amount'] ?? $data['amount'] ?? null;
            $currency = $data['currency_type'] ?? $data['currency'] ?? null;

            return [
                'valid' => in_array($status, ['VALID', 'VALIDATED'], true),
                'status' => $status !== '' ? $status : null,
                'amount' => is_numeric($amount) ? (float) $amount : null,
                'currency' => is_string($currency) && $currency !== '' ? strtoupper($currency) : null,
                'reference' => isset($data['tran_id']) ? (string) $data['tran_id'] : $reference,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['valid' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyWebhook(TenantGateway $config, array $payload, ?string $signature): bool
    {
        // SSLCommerz IPNs are not HMAC-signed; authenticity comes from validating
        // the transaction with the provider (verifyTransaction).
        return true;
    }

    public function refund(TenantGateway $config, string $providerRef, float $amount, string $reason): array
    {
        return ['status' => 'pending', 'reference' => null, 'raw' => ['note' => 'Issue SSLCommerz refunds from the merchant panel.']];
    }
}
