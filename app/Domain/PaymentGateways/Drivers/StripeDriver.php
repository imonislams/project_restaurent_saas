<?php

namespace App\Domain\PaymentGateways\Drivers;

use App\Domain\PaymentGateways\Contracts\GatewayDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use Illuminate\Support\Facades\Http;

/**
 * Stripe driver. Uses hosted Checkout Sessions and verifies the payment with
 * the PaymentIntents API — a browser return is never treated as proof of
 * payment. Webhooks are verified with the Stripe-Signature scheme.
 */
class StripeDriver implements GatewayDriver
{
    public function name(): string
    {
        return 'stripe';
    }

    protected function secret(TenantGateway $config): string
    {
        return (string) ($config->credentials['secret_key'] ?? '');
    }

    public function createCheckout(TenantGateway $config, array $payload): array
    {
        $amount = (int) round(((float) ($payload['amount'] ?? 0)) * 100);
        $currency = strtolower((string) ($payload['currency'] ?? 'usd'));

        try {
            $response = Http::withToken($this->secret($config))
                ->asForm()
                ->timeout(20)
                ->post('https://api.stripe.com/v1/checkout/sessions', [
                    'mode' => 'payment',
                    'success_url' => $payload['success_url'] ?? '',
                    'cancel_url' => $payload['cancel_url'] ?? '',
                    'line_items[0][quantity]' => 1,
                    'line_items[0][price_data][currency]' => $currency,
                    'line_items[0][price_data][unit_amount]' => $amount,
                    'line_items[0][price_data][product_data][name]' => $payload['description'] ?? 'Restaurant order',
                    'metadata[reference]' => $payload['reference'] ?? '',
                ]);

            $data = $response->json() ?? [];

            return [
                'status' => isset($data['id']) ? 'pending' : 'failed',
                'reference' => $data['id'] ?? null,
                'redirect_url' => $data['url'] ?? null,
                'raw' => $data,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'failed', 'reference' => null, 'redirect_url' => null, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyTransaction(TenantGateway $config, string $reference): array
    {
        // `reference` is a Checkout Session id; resolve its PaymentIntent.
        try {
            $session = Http::withToken($this->secret($config))->timeout(20)
                ->get("https://api.stripe.com/v1/checkout/sessions/{$reference}")->json() ?? [];

            $intentId = $session['payment_intent'] ?? null;

            if (! $intentId) {
                return ['valid' => false, 'status' => $session['payment_status'] ?? null, 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => $session];
            }

            $intent = Http::withToken($this->secret($config))->timeout(20)
                ->get("https://api.stripe.com/v1/payment_intents/{$intentId}")->json() ?? [];

            return [
                'valid' => ($intent['status'] ?? '') === 'succeeded',
                'status' => $intent['status'] ?? null,
                'amount' => isset($intent['amount_received']) ? ((int) $intent['amount_received']) / 100 : null,
                'currency' => isset($intent['currency']) ? strtoupper((string) $intent['currency']) : null,
                'reference' => $reference,
                'raw' => $intent,
            ];
        } catch (\Throwable $e) {
            return ['valid' => false, 'status' => null, 'amount' => null, 'currency' => null, 'reference' => $reference, 'raw' => ['error' => $e->getMessage()]];
        }
    }

    public function verifyWebhook(TenantGateway $config, array $payload, ?string $signature): bool
    {
        $secret = (string) ($config->credentials['webhook_secret'] ?? '');

        if ($secret === '' || ! $signature) {
            return false;
        }

        $parts = [];
        foreach (explode(',', $signature) as $pair) {
            [$key, $value] = array_pad(explode('=', $pair, 2), 2, null);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $expected = $parts['v1'] ?? null;

        if (! $timestamp || ! $expected) {
            return false;
        }

        $computed = hash_hmac('sha256', $timestamp.'.'.$this->rawPayload($payload), $secret);

        return hash_equals($computed, $expected);
    }

    protected function rawPayload(array $payload): string
    {
        return (string) ($payload['__raw'] ?? json_encode($payload));
    }

    public function refund(TenantGateway $config, string $providerRef, float $amount, string $reason): array
    {
        return ['status' => 'pending', 'reference' => null, 'raw' => ['note' => 'Issue Stripe refunds from the Stripe dashboard or API with the payment intent id.']];
    }
}
