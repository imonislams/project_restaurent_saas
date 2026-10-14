<?php

namespace App\Domain\Payments;

use App\Domain\Auditing\AuditLogger;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\PaymentGateways\TenantGatewayManager;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\Models\PaymentWebhookEvent;
use Illuminate\Support\Facades\DB;

/**
 * Records provider webhooks idempotently: the raw event is stored (deduplicated
 * by provider + event id), the signature is verified, and only a valid,
 * first-seen event is processed.
 */
class WebhookService
{
    public function __construct(
        protected PaymentGatewayManager $gateways,
        protected AuditLogger $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(string $provider, string $payload, ?string $signature, array $data): PaymentWebhookEvent
    {
        $valid = $this->verifySignature($provider, $payload, $signature);
        $eventId = $data['id'] ?? $data['event_id'] ?? null;

        return DB::transaction(function () use ($provider, $data, $eventId, $valid) {
            $event = PaymentWebhookEvent::withoutGlobalScopes()->firstOrCreate(
                ['provider' => $provider, 'event_id' => $eventId],
                [
                    'tenant_id' => $data['tenant_id'] ?? null,
                    'event_type' => $data['type'] ?? null,
                    'payload' => $data,
                    'signature_valid' => $valid,
                ],
            );

            if ($event->wasRecentlyCreated && $valid) {
                $this->process($event, $data);
                $event->forceFill(['processed' => true, 'processed_at' => now()])->save();
            }

            if (! $valid) {
                $event->forceFill(['note' => 'Signature verification failed.'])->save();
            }

            $this->audit->log('payment.webhook_received', $event, [
                'provider' => $provider,
                'event_type' => $event->event_type,
                'valid' => $valid,
            ], null, $event->tenant_id);

            return $event;
        });
    }

    /**
     * Verify a webhook signature. Tenant-configured gateway providers are
     * verified against their own secrets; cash has no webhooks; the legacy
     * manual/stub providers keep their previous behaviour.
     *
     * @param  array<string, mixed>  $data
     */
    protected function verifySignature(string $provider, string $payload, ?string $signature): bool
    {
        $manager = app(TenantGatewayManager::class);

        if (in_array($provider, $manager->providers(), true)) {
            if ($provider === 'cash') {
                return true;
            }

            return $manager->verifyAnyEnabled($provider, json_decode($payload, true) ?: [], $signature);
        }

        return $this->gateways->for($provider)->verifyWebhook($payload, $signature);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function process(PaymentWebhookEvent $event, array $data): void
    {
        $nested = is_array($data['data'] ?? null) ? $data['data'] : [];
        $reference = $data['reference'] ?? $nested['reference'] ?? null;
        $status = $data['status'] ?? $nested['status'] ?? null;

        if (! $reference || ! in_array($status, ['succeeded', 'paid'], true)) {
            return;
        }

        $payment = Payment::withoutGlobalScopes()->where('reference', $reference)->first();

        if (! $payment) {
            return;
        }

        // SSLCommerz and bKash callbacks are not HMAC-signed, so a claimed status
        // in the payload is not proof of payment — confirm it with the provider.
        if (in_array($event->provider, ['sslcommerz', 'bkash'], true)) {
            $config = TenantGateway::withoutGlobalScopes()
                ->where('tenant_id', $payment->tenant_id)
                ->where('provider', $event->provider)
                ->where('is_enabled', true)
                ->first();

            if (! $config) {
                return;
            }

            $verified = app(TenantGatewayManager::class)
                ->driverFor($config)
                ->verifyTransaction($config, $reference);

            if (! ($verified['valid'] ?? false)) {
                return;
            }
        }

        $payment->forceFill(['status' => PaymentStatus::Succeeded->value, 'paid_at' => now()])->save();
    }
}
