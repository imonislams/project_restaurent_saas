<?php

namespace App\Domain\Billing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\Models\PlatformPaymentEvent;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\SubscriptionService;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Platform payment state machine.
 *
 * A payment is only marked succeeded after the gateway transaction has been
 * verified server-side (amount, currency and reference all checked). Browser
 * return URLs and provider notifications are treated as untrusted input.
 */
class PlatformPaymentService
{
    public function __construct(
        protected PlatformGatewayManager $gateways,
        protected AuditLogger $audit,
        protected SubscriptionService $subscriptions,
    ) {}

    /**
     * @return array{payment: PlatformPayment, redirect_url: ?string}
     */
    public function initiate(SubscriptionInvoice $invoice, PaymentGateway $config, User $actor): array
    {
        if (! $config->is_enabled || ! $config->supports($invoice->currency)) {
            throw ValidationException::withMessages([
                'gateway' => "The selected gateway does not support {$invoice->currency} payments.",
            ]);
        }

        if ($invoice->status->isSettled()) {
            throw ValidationException::withMessages(['gateway' => 'This invoice is already settled.']);
        }

        $provider = $config->provider;
        $reference = 'PAY-'.$invoice->number.'-'.Str::upper(Str::random(6));

        $payment = PlatformPayment::create([
            'tenant_id' => $invoice->tenant_id,
            'subscription_id' => $invoice->subscription_id,
            'subscription_invoice_id' => $invoice->getKey(),
            'gateway' => $provider,
            'provider_ref' => $reference,
            'amount' => $invoice->outstandingAmount() > 0 ? $invoice->outstandingAmount() : (float) $invoice->amount,
            'currency' => $invoice->currency,
            'status' => PlatformPaymentStatus::Pending,
            'attempt_number' => 1,
            'idempotency_key' => $reference,
        ]);

        $payment->attempts()->create(['status' => 'pending', 'reference' => $reference]);

        $driver = $this->gateways->driverFor($config);
        $result = $driver->createCheckout($config, $this->checkoutPayload($invoice, $payment, $reference, $provider));

        $payment->forceFill([
            'provider_ref' => $result['reference'] ?? $reference,
            'meta' => ['gateway_config_id' => $config->getKey(), 'gateway' => $config->displayName(), 'checkout' => $result['raw']],
        ])->save();

        if (! $result['redirect_url'] && ($result['status'] ?? null) === 'failed') {
            $payment->forceFill([
                'status' => PlatformPaymentStatus::Failed,
                'failure_reason' => 'Checkout could not be created at the gateway.',
            ])->save();
        }

        $this->audit->log('platform.payment_initiated', $payment, [
            'gateway' => $config->displayName(),
            'amount' => (float) $payment->amount,
        ], $actor, $invoice->tenant_id);

        return ['payment' => $payment->fresh(), 'redirect_url' => $result['redirect_url']];
    }

    /**
     * Process a provider notification (IPN or return URL) idempotently.
     *
     * @param  array<string, mixed>  $payload
     * @return array{processed: bool, duplicate: bool, reason: ?string}
     */
    public function handleNotification(string $provider, array $payload, ?User $actor = null): array
    {
        $reference = (string) ($payload['tran_id'] ?? '');
        $eventId = (string) ($payload['val_id'] ?? $payload['bank_tran_id'] ?? $reference);

        $payment = PlatformPayment::query()->where('provider_ref', $reference)->first();

        if (! $payment && $reference !== '') {
            $payment = PlatformPayment::query()->where('idempotency_key', $reference)->first();
        }

        // Resolve the exact gateway configuration the payment was created with,
        // falling back to any enabled config for the provider.
        $configId = $payment?->meta['gateway_config_id'] ?? null;
        $config = ($configId ? PaymentGateway::query()->find($configId) : null) ?? $this->gateways->config($provider);
        $driver = $config ? $this->gateways->driverFor($config) : $this->gateways->driver($provider);

        $signatureValid = $config ? $driver->verifyWebhook($config, $payload) : false;

        $event = PlatformPaymentEvent::firstOrCreate(
            ['provider' => $provider, 'event_id' => $eventId],
            [
                'tenant_id' => $payment?->tenant_id,
                'event_type' => $payload['status'] ?? null,
                'payload' => $payload,
                'signature_valid' => $signatureValid,
            ],
        );

        if (! $event->wasRecentlyCreated) {
            return ['processed' => false, 'duplicate' => true, 'reason' => 'Duplicate notification'];
        }

        if (! $payment) {
            $event->forceFill(['processed' => true, 'processed_at' => now(), 'note' => 'No matching payment'])->save();

            return ['processed' => false, 'duplicate' => false, 'reason' => 'No matching payment'];
        }

        $valId = (string) ($payload['val_id'] ?? '');
        $verification = $config && $valId !== ''
            ? $driver->verifyTransaction($config, $valId)
            : ['valid' => false, 'amount' => null, 'currency' => null, 'raw' => []];

        $event->forceFill(['signature_valid' => $signatureValid && $verification['valid']])->save();

        if (! $verification['valid']) {
            $this->fail($payment, 'Transaction could not be verified with the gateway.');
            $event->forceFill(['processed' => true, 'processed_at' => now(), 'note' => 'Verification failed'])->save();

            return ['processed' => false, 'duplicate' => false, 'reason' => 'Verification failed'];
        }

        if ($verification['amount'] !== null && abs($verification['amount'] - (float) $payment->amount) > 0.01) {
            $this->fail($payment, 'Amount mismatch between gateway and local record.');
            $event->forceFill(['processed' => true, 'processed_at' => now(), 'note' => 'Amount mismatch'])->save();

            return ['processed' => false, 'duplicate' => false, 'reason' => 'Amount mismatch'];
        }

        if ($verification['currency'] !== null && $verification['currency'] !== strtoupper((string) $payment->currency)) {
            $this->fail($payment, 'Currency mismatch between gateway and local record.');
            $event->forceFill(['processed' => true, 'processed_at' => now(), 'note' => 'Currency mismatch'])->save();

            return ['processed' => false, 'duplicate' => false, 'reason' => 'Currency mismatch'];
        }

        $this->succeed($payment, $payload, $verification['raw'] ?? [], $actor);

        $event->forceFill(['processed' => true, 'processed_at' => now(), 'note' => 'Verified and applied'])->save();

        return ['processed' => true, 'duplicate' => false, 'reason' => null];
    }

    /** Settle a pending manual payment (no external gateway to confirm). */
    public function settleManually(PlatformPayment $payment, User $actor): void
    {
        if ($payment->status === PlatformPaymentStatus::Succeeded) {
            return;
        }

        $this->succeed($payment, ['settled_by' => $actor->getKey()], ['note' => 'Settled manually by an administrator.'], $actor);
    }

    /** @param array<string, mixed> $raw */
    public function succeed(PlatformPayment $payment, array $payload, array $raw, ?User $actor = null): void
    {
        DB::transaction(function () use ($payment, $payload, $raw, $actor) {
            // Idempotent: never re-apply an already-succeeded payment.
            if ($payment->status === PlatformPaymentStatus::Succeeded) {
                return;
            }

            $payment->forceFill([
                'status' => PlatformPaymentStatus::Succeeded,
                'paid_at' => now(),
            ])->save();

            $payment->attempts()->create([
                'status' => 'succeeded',
                'reference' => $payload['bank_tran_id'] ?? $payment->provider_ref,
                'payload' => $raw ?: $payload,
            ]);

            if ($payment->invoice) {
                $this->subscriptions->payInvoice($payment->invoice, $actor);
            }

            $this->audit->log('platform.payment_succeeded', $payment, [
                'gateway' => $payment->gateway,
                'amount' => (float) $payment->amount,
            ], $actor, $payment->tenant_id);
        });
    }

    public function fail(PlatformPayment $payment, string $reason): void
    {
        if ($payment->status === PlatformPaymentStatus::Succeeded) {
            return;
        }

        $payment->forceFill([
            'status' => PlatformPaymentStatus::Failed,
            'failure_reason' => $reason,
        ])->save();

        $payment->attempts()->create(['status' => 'failed', 'reference' => $payment->provider_ref, 'payload' => ['reason' => $reason]]);

        $this->audit->log('platform.payment_failed', $payment, ['reason' => $reason], null, $payment->tenant_id);
    }

    /** @return array<string, mixed> */
    protected function checkoutPayload(SubscriptionInvoice $invoice, PlatformPayment $payment, string $reference, string $provider): array
    {
        $tenant = $invoice->tenant;

        return array_filter([
            'total_amount' => number_format((float) $payment->amount, 2, '.', ''),
            'currency' => $payment->currency,
            'tran_id' => $reference,
            'success_url' => route('payments.callback', ['provider' => $provider, 'result' => 'success']),
            'fail_url' => route('payments.callback', ['provider' => $provider, 'result' => 'fail']),
            'cancel_url' => route('payments.callback', ['provider' => $provider, 'result' => 'cancel']),
            'ipn_url' => route('payments.ipn', ['provider' => $provider]),
            'cus_name' => $tenant?->name,
            'cus_email' => $tenant?->getSetting('billing.email', $tenant?->business_email),
            'cus_phone' => $tenant?->getSetting('company.phone'),
            'cus_add1' => $tenant?->getSetting('company.address'),
            'cus_city' => $tenant?->getSetting('company.city'),
            'cus_country' => $tenant?->getSetting('region.country', 'Bangladesh'),
            'product_name' => 'Subscription '.$invoice->number,
            'product_category' => 'Software',
            'product_profile' => 'non-physical-goods',
            'shipping_method' => 'NO',
            'num_of_item' => 1,
        ], fn ($value) => $value !== null && $value !== '');
    }
}
