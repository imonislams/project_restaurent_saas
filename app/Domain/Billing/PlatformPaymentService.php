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
 *
 * Notifications are provider-agnostic: each driver describes how to read its own
 * payload, and subscription lifecycle events are handed to SubscriptionSyncService.
 */
class PlatformPaymentService
{
    public function __construct(
        protected PlatformGatewayManager $gateways,
        protected AuditLogger $audit,
        protected SubscriptionService $subscriptions,
        protected SubscriptionSyncService $sync,
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
            // Keep the provider's reason (e.g. "No Paddle price configured for
            // this plan.") so the platform admin can see what to fix. Providers
            // may return `error` as a string or as a structured object.
            $payment->forceFill([
                'status' => PlatformPaymentStatus::Failed,
                'failure_reason' => $this->failureReason($result['raw'] ?? []),
            ])->save();
        }

        $this->audit->log('platform.payment_initiated', $payment, [
            'gateway' => $config->displayName(),
            'amount' => (float) $payment->amount,
        ], $actor, $invoice->tenant_id);

        return ['payment' => $payment->fresh(), 'redirect_url' => $result['redirect_url']];
    }

    /**
     * Process a provider notification (IPN, webhook or return URL) idempotently.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $headers
     * @return array{processed: bool, duplicate: bool, reason: ?string}
     */
    public function handleNotification(string $provider, array $payload, ?string $rawBody = null, array $headers = [], ?User $actor = null): array
    {
        $driver = $this->gateways->driver($provider);
        $reference = $driver->notificationReference($payload);
        $eventId = $driver->notificationEventId($payload) ?? $reference;

        $payment = $this->findPayment($reference);
        $config = $this->resolveConfig($provider, $payment);
        $effectiveDriver = $config ? $this->gateways->driverFor($config) : $driver;

        $signatureValid = $config ? $effectiveDriver->verifyWebhook($config, $payload, $rawBody, $headers) : false;

        $event = PlatformPaymentEvent::firstOrCreate(
            ['provider' => $provider, 'event_id' => $eventId],
            [
                'tenant_id' => $payment?->tenant_id,
                'event_type' => $driver->notificationEventType($payload),
                'payload' => $payload,
                'signature_valid' => $signatureValid,
            ],
        );

        if (! $event->wasRecentlyCreated) {
            return ['processed' => false, 'duplicate' => true, 'reason' => 'Duplicate notification'];
        }

        // Subscription lifecycle events (Paddle subscription.* / renewal transactions).
        if ($payment === null && $this->sync->handles($provider, $payload)) {
            $outcome = $this->sync->handleProviderEvent($provider, $payload, $config, $signatureValid, $actor);

            $event->forceFill([
                'tenant_id' => $event->tenant_id ?? $outcome['tenant_id'],
                'processed' => true,
                'processed_at' => now(),
                'note' => $outcome['reason'] ?? 'Subscription event applied',
            ])->save();

            return ['processed' => $outcome['processed'], 'duplicate' => false, 'reason' => $outcome['reason']];
        }

        if (! $payment) {
            $event->forceFill(['processed' => true, 'processed_at' => now(), 'note' => 'No matching payment'])->save();

            return ['processed' => false, 'duplicate' => false, 'reason' => 'No matching payment'];
        }

        $verificationId = $effectiveDriver->verificationId($payload);
        $verification = $config && $verificationId !== null && $verificationId !== ''
            ? $effectiveDriver->verifyTransaction($config, $verificationId)
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

    /**
     * Verify a pending payment directly with the provider (used on a return URL).
     * A browser redirect is never proof of payment — the transaction is confirmed
     * against the provider API, and amount/currency are re-checked.
     */
    public function verifyPending(string $provider, string $providerRef): bool
    {
        $payment = PlatformPayment::query()->where('provider_ref', $providerRef)->first();

        if (! $payment) {
            return false;
        }

        if ($payment->status === PlatformPaymentStatus::Succeeded) {
            return true;
        }

        $config = $this->resolveConfig($provider, $payment);

        if (! $config) {
            return false;
        }

        $verification = $this->gateways->driverFor($config)->verifyTransaction($config, $providerRef);

        if (! $verification['valid']) {
            // Not settled yet (eventual consistency) — leave it pending for the
            // webhook rather than failing a payment that may be completing.
            $status = strtolower((string) ($verification['status'] ?? ''));

            if (in_array($status, ['ready', 'draft', 'processing', 'created', 'pending'], true)) {
                return false;
            }

            $this->fail($payment, 'Transaction could not be verified with the gateway.');

            return false;
        }

        if ($verification['amount'] !== null && abs($verification['amount'] - (float) $payment->amount) > 0.01) {
            $gatewayAmount = (float) $verification['amount'];
            $hint = $gatewayAmount <= 0
                ? ' The provider returned a zero-value transaction — check for a trial period on the gateway price.'
                : '';

            $this->fail($payment, sprintf(
                'Amount mismatch: gateway %s %s vs invoice %s %s.%s',
                number_format($gatewayAmount, 2, '.', ''),
                $verification['currency'] ?? $payment->currency,
                number_format((float) $payment->amount, 2, '.', ''),
                $payment->currency,
                $hint,
            ));

            return false;
        }

        if ($verification['currency'] !== null && $verification['currency'] !== strtoupper((string) $payment->currency)) {
            $this->fail($payment, 'Currency mismatch between gateway and local record.');

            return false;
        }

        $this->succeed($payment, [], $verification['raw'] ?? []);

        return true;
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

    /**
     * A readable failure reason from a driver's raw response. Providers return
     * `error` either as a string or as a structured object (e.g. Paddle:
     * `{type, code, detail, documentation_url}`).
     *
     * @param  array<string, mixed>  $raw
     */
    protected function failureReason(array $raw, string $fallback = 'Checkout could not be created at the gateway.'): string
    {
        $error = $raw['error'] ?? null;

        if (is_string($error) && trim($error) !== '') {
            return $error;
        }

        if (is_array($error)) {
            $message = $error['detail'] ?? $error['message'] ?? $error['code'] ?? null;

            if (is_string($message) && trim($message) !== '') {
                return $message;
            }
        }

        return $fallback;
    }

    protected function findPayment(?string $reference): ?PlatformPayment
    {
        if ($reference === null || $reference === '') {
            return null;
        }

        return PlatformPayment::query()->where('provider_ref', $reference)->first()
            ?? PlatformPayment::query()->where('idempotency_key', $reference)->first();
    }

    protected function resolveConfig(string $provider, ?PlatformPayment $payment): ?PaymentGateway
    {
        $configId = $payment?->meta['gateway_config_id'] ?? null;

        return ($configId ? PaymentGateway::query()->find($configId) : null)
            ?? $this->gateways->config($provider);
    }

    /**
     * Common checkout payload. Each driver reads the keys it understands.
     *
     * @return array<string, mixed>
     */
    protected function checkoutPayload(SubscriptionInvoice $invoice, PlatformPayment $payment, string $reference, string $provider): array
    {
        $tenant = $invoice->tenant;

        $payload = array_filter([
            'total_amount' => number_format((float) $payment->amount, 2, '.', ''),
            'currency' => $payment->currency,
            'tran_id' => $reference,
            'cus_name' => $tenant?->name,
            'cus_email' => $tenant?->getSetting('billing.email', $tenant?->getSetting('company.email', $tenant?->business_email)),
            'cus_phone' => $tenant?->getSetting('company.phone'),
            'cus_add1' => $tenant?->getSetting('company.address'),
            'cus_city' => $tenant?->getSetting('billing.city'),
            'cus_country' => $tenant?->getSetting('billing.country', $tenant?->getSetting('region.country', 'Bangladesh')),
            'product_name' => 'Subscription '.$invoice->number,
            'product_category' => 'Software',
            'product_profile' => 'non-physical-goods',
            'shipping_method' => 'NO',
            'num_of_item' => 1,
        ], fn ($value) => $value !== null && $value !== '');

        // Gateway callback/IPN endpoints (hosted-checkout providers).
        $payload += [
            'success_url' => route('payments.callback', ['provider' => $provider, 'result' => 'success']),
            'fail_url' => route('payments.callback', ['provider' => $provider, 'result' => 'fail']),
            'cancel_url' => route('payments.callback', ['provider' => $provider, 'result' => 'cancel']),
            'ipn_url' => route('payments.ipn', ['provider' => $provider]),
            'callback_url' => route('payments.callback', ['provider' => $provider, 'result' => 'success']),
        ];

        // Provider-specific fields consumed by the newer drivers.
        $payload['reference'] = $reference;
        $payload['amount'] = (float) $payment->amount;
        $payload['currency'] = $payment->currency;
        $payload['invoice_number'] = $invoice->number;
        $payload['tenant_id'] = $invoice->tenant_id;
        $payload['price_id'] = $this->providerPriceId($invoice, $provider);

        // Drop empty optional fields (e.g. a null Paddle price id) so providers
        // only receive keys they can use.
        return array_filter($payload, fn ($value) => $value !== null && $value !== '');
    }

    /** The provider's configured price id for this invoice's plan/currency/interval. */
    protected function providerPriceId(SubscriptionInvoice $invoice, string $provider): ?string
    {
        $subscription = $invoice->subscription;

        if (! $subscription) {
            return null;
        }

        $subscription->loadMissing('plan.prices');

        $prices = $subscription->plan?->prices;

        if (! $prices) {
            return null;
        }

        $interval = $subscription->billing_cycle->value;

        $price = $prices->first(fn ($p) => strtoupper($p->currency) === strtoupper($invoice->currency) && $p->interval === $interval)
            ?? $prices->firstWhere('interval', $interval);

        return $price?->providerPriceId($provider);
    }
}
