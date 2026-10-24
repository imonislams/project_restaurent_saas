<?php

namespace App\Domain\Billing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Notifications\NotificationService;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\SubscriptionService;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Maps provider subscription lifecycle events onto the internal subscription
 * state machine. Provider events are a *synchronisation* signal — the internal
 * subscription remains the source of truth for application access.
 *
 * Only providers with native recurring billing (currently Paddle) emit these
 * events; bKash/SSLCOMMERZ renew through a fresh checkout instead.
 */
class SubscriptionSyncService
{
    public function __construct(
        protected SubscriptionService $subscriptions,
        protected AuditLogger $audit,
        protected NotificationService $notifications,
    ) {}

    /**
     * Whether a provider notification should be routed to the sync service
     * rather than the payment path.
     *
     * @param  array<string, mixed>  $payload
     */
    public function handles(string $provider, array $payload): bool
    {
        if ($provider !== 'paddle') {
            return false;
        }

        $type = (string) ($payload['event_type'] ?? '');

        return (bool) preg_match('/^(subscription|transaction|adjustment)\./', $type);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{processed: bool, reason: ?string, tenant_id: ?int}
     */
    public function handleProviderEvent(string $provider, array $payload, ?PaymentGateway $config, bool $signatureValid, ?User $actor = null): array
    {
        if (! $signatureValid) {
            return ['processed' => false, 'reason' => 'Signature verification failed', 'tenant_id' => null];
        }

        $type = (string) ($payload['event_type'] ?? '');

        if (str_starts_with($type, 'subscription.')) {
            return $this->syncSubscription($provider, $payload, $actor);
        }

        if (str_starts_with($type, 'transaction.payment_failed') || str_starts_with($type, 'transaction.past_due')) {
            return $this->recordFailure($provider, $payload, $actor);
        }

        if (str_starts_with($type, 'transaction.')) {
            return $this->recordRenewal($provider, $payload, $actor);
        }

        if (str_starts_with($type, 'adjustment.')) {
            return $this->recordAdjustment($provider, $payload, $actor);
        }

        return ['processed' => false, 'reason' => 'Unhandled event type: '.$type, 'tenant_id' => null];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{processed: bool, reason: ?string, tenant_id: ?int}
     */
    protected function syncSubscription(string $provider, array $payload, ?User $actor): array
    {
        $subscription = $this->resolveSubscription($payload);

        if (! $subscription) {
            return ['processed' => false, 'reason' => 'No matching subscription', 'tenant_id' => null];
        }

        $data = $payload['data'] ?? [];
        $status = strtolower((string) ($data['status'] ?? ''));
        $previous = $subscription->status;

        $attributes = [
            'provider' => $provider,
            'provider_ref' => $data['id'] ?? $subscription->provider_ref,
            'cancel_at_period_end' => data_get($data, 'scheduled_change.action') === 'cancel',
        ];

        $start = $this->parseDate(data_get($data, 'current_billing_period.starts_at'));
        $end = $this->parseDate(data_get($data, 'current_billing_period.ends_at'));

        if ($start) {
            $attributes['current_period_start'] = $start;
        }
        if ($end) {
            $attributes['current_period_end'] = $end;
        }

        $attributes['status'] = match ($status) {
            'active' => SubscriptionStatus::Active,
            'trialing' => SubscriptionStatus::Trialing,
            'past_due' => SubscriptionStatus::PastDue,
            'paused' => SubscriptionStatus::Suspended,
            'canceled' => SubscriptionStatus::Cancelled,
            default => $subscription->status,
        };

        if ($attributes['status'] === SubscriptionStatus::Active) {
            $attributes['grace_ends_at'] = null;
            $attributes['suspended_at'] = null;
        }

        if ($attributes['status'] === SubscriptionStatus::Cancelled) {
            $attributes['cancelled_at'] = $subscription->cancelled_at ?? now();
        }

        $subscription->forceFill($attributes)->save();

        $this->audit->log('subscription.provider_synced', $subscription, [
            'provider' => $provider,
            'event' => $payload['event_type'] ?? null,
            'from' => $previous->value,
            'to' => $subscription->status->value,
        ], $actor, $subscription->tenant_id);

        if ($previous !== $subscription->status) {
            if ($subscription->status === SubscriptionStatus::Active) {
                $this->notifications->subscriptionActivated($subscription);
            } elseif ($subscription->status === SubscriptionStatus::Cancelled) {
                $this->notifications->subscriptionCancelled($subscription);
            }
        }

        return ['processed' => true, 'reason' => null, 'tenant_id' => $subscription->tenant_id];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{processed: bool, reason: ?string, tenant_id: ?int}
     */
    protected function recordRenewal(string $provider, array $payload, ?User $actor): array
    {
        $subscription = $this->resolveSubscription($payload);

        if (! $subscription) {
            return ['processed' => false, 'reason' => 'No matching subscription', 'tenant_id' => null];
        }

        $transactionId = (string) data_get($payload, 'data.id', '');

        if ($transactionId === '') {
            return ['processed' => false, 'reason' => 'Transaction id missing', 'tenant_id' => $subscription->tenant_id];
        }

        // Idempotent: this renewal transaction has already been recorded.
        if (PlatformPayment::query()->where('provider_ref', $transactionId)->exists()
            || PlatformPayment::query()->where('idempotency_key', $transactionId)->exists()) {
            return ['processed' => false, 'reason' => 'Renewal already recorded', 'tenant_id' => $subscription->tenant_id];
        }

        $amount = round(((float) data_get($payload, 'data.details.totals.grand_total', 0)) / 100, 2);
        $currency = strtoupper((string) data_get($payload, 'data.currency_code', $subscription->plan?->currency ?? 'USD'));
        $start = $this->parseDate(data_get($payload, 'data.billing_period.starts_at'));
        $end = $this->parseDate(data_get($payload, 'data.billing_period.ends_at'));

        DB::transaction(function () use ($subscription, $provider, $transactionId, $amount, $currency, $start, $end, $actor) {
            $invoice = $this->subscriptions->applyProviderRenewal($subscription, $start, $end, $actor);

            PlatformPayment::create([
                'tenant_id' => $subscription->tenant_id,
                'subscription_id' => $subscription->getKey(),
                'subscription_invoice_id' => $invoice->getKey(),
                'gateway' => $provider,
                'provider_ref' => $transactionId,
                'amount' => $amount > 0 ? $amount : (float) $invoice->amount,
                'currency' => $currency,
                'status' => PlatformPaymentStatus::Succeeded,
                'attempt_number' => 1,
                'paid_at' => now(),
                'idempotency_key' => $transactionId,
                'meta' => ['source' => 'provider_renewal', 'transaction' => $transactionId],
            ]);

            $this->subscriptions->payInvoice($invoice, $actor);
        });

        $this->notifications->paymentSucceeded($subscription->tenant, null, $amount, $currency, ucfirst($provider));

        return ['processed' => true, 'reason' => null, 'tenant_id' => $subscription->tenant_id];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{processed: bool, reason: ?string, tenant_id: ?int}
     */
    protected function recordFailure(string $provider, array $payload, ?User $actor): array
    {
        $subscription = $this->resolveSubscription($payload);

        if (! $subscription) {
            return ['processed' => false, 'reason' => 'No matching subscription', 'tenant_id' => null];
        }

        if ($subscription->status !== SubscriptionStatus::PastDue) {
            $this->subscriptions->markPastDue($subscription, $actor);
        }

        $amount = round(((float) data_get($payload, 'data.details.totals.grand_total', 0)) / 100, 2);
        $currency = strtoupper((string) data_get($payload, 'data.currency_code', $subscription->plan?->currency ?? 'USD'));

        $this->notifications->paymentFailed($subscription->tenant, null, $amount, $currency);

        return ['processed' => true, 'reason' => null, 'tenant_id' => $subscription->tenant_id];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{processed: bool, reason: ?string, tenant_id: ?int}
     */
    protected function recordAdjustment(string $provider, array $payload, ?User $actor): array
    {
        $transactionId = (string) data_get($payload, 'data.transaction_id', '');
        $payment = $transactionId !== ''
            ? PlatformPayment::query()->where('provider_ref', $transactionId)->first()
            : null;

        if (! $payment) {
            return ['processed' => false, 'reason' => 'No matching payment for adjustment', 'tenant_id' => null];
        }

        $amount = round(((float) data_get($payload, 'data.totals.total', data_get($payload, 'data.totals.grand_total', 0))) / 100, 2);
        $refunded = round((float) $payment->refunded_amount + $amount, 2);

        $payment->forceFill([
            'refunded_amount' => $refunded,
            'status' => $refunded >= (float) $payment->amount
                ? PlatformPaymentStatus::Refunded
                : PlatformPaymentStatus::PartiallyRefunded,
        ])->save();

        $this->audit->log('platform.refund_recorded', $payment, ['amount' => $amount], $actor, $payment->tenant_id);
        $this->notifications->refundProcessed($payment->tenant, $amount, $payment->currency);

        return ['processed' => true, 'reason' => null, 'tenant_id' => $payment->tenant_id];
    }

    /** @param array<string, mixed> $payload */
    protected function resolveSubscription(array $payload): ?Subscription
    {
        $tenantId = data_get($payload, 'data.custom_data.tenant_id');

        if ($tenantId) {
            $subscription = Subscription::withoutGlobalScopes()->where('tenant_id', (int) $tenantId)->first();

            if ($subscription) {
                return $subscription;
            }
        }

        $providerRef = data_get($payload, 'data.id') ?? data_get($payload, 'data.subscription_id');

        return $providerRef
            ? Subscription::withoutGlobalScopes()->where('provider_ref', $providerRef)->first()
            : null;
    }

    protected function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }
}
