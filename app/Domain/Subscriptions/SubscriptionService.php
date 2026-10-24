<?php

namespace App\Domain\Subscriptions;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Documents\DocumentNumberGenerator;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\InvoiceStatus;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Coupon;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Subscription lifecycle. Entitlements are always resolved here on the server
 * from the stored subscription — never from a client-supplied plan.
 *
 * State machine: trialing → active → past_due → grace_period → suspended;
 * cancelled / expired are terminal (access revoked). A grace period retains
 * access while dunning.
 */
class SubscriptionService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected AuditLogger $audit,
        protected PricingService $pricing,
        protected CouponService $coupons,
    ) {}

    public function startTrial(Tenant $tenant, ?Plan $plan = null): ?Subscription
    {
        $plan ??= Plan::query()->where('is_active', true)->whereNull('archived_at')->orderBy('sort_order')->first();

        if (! $plan) {
            return null;
        }

        $days = $plan->trial_days > 0 ? $plan->trial_days : 14;

        $subscription = Subscription::updateOrCreate(
            ['tenant_id' => $tenant->getKey()],
            [
                'plan_id' => $plan->getKey(),
                'status' => SubscriptionStatus::Trialing,
                'billing_cycle' => BillingCycle::Monthly,
                'trial_ends_at' => now()->addDays($days),
                'current_period_start' => now(),
                'current_period_end' => now()->addDays($days),
                'cancelled_at' => null,
                'suspended_at' => null,
                'grace_ends_at' => null,
            ],
        );

        $subscription->snapshotPlan($plan);
        $subscription->save();

        return $subscription;
    }

    public function changePlan(Subscription $subscription, Plan $plan, BillingCycle $cycle, User $actor): Subscription
    {
        if ($plan->isArchived()) {
            throw ValidationException::withMessages(['plan_id' => 'This plan is archived and cannot be assigned.']);
        }

        $subscription->forceFill([
            'plan_id' => $plan->getKey(),
            'billing_cycle' => $cycle,
        ]);
        $subscription->snapshotPlan($plan);
        $subscription->save();

        $this->audit->log('subscription.plan_changed', $subscription, [
            'plan' => $plan->name,
            'cycle' => $cycle->value,
            'plan_version' => $plan->version,
        ], $actor, $subscription->tenant_id);

        return $subscription->fresh('plan');
    }

    public function activate(Subscription $subscription, ?User $actor = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Active,
                'suspended_at' => null,
                'grace_ends_at' => null,
                'cancel_at_period_end' => false,
                'current_period_start' => now(),
                'current_period_end' => now()->addMonths($subscription->billing_cycle->months()),
            ])->save();

            $this->setTenantStatus($subscription, TenantStatus::Active);

            $this->audit->log('subscription.activated', $subscription, [], $actor, $subscription->tenant_id);

            return $subscription->fresh();
        });
    }

    public function markPastDue(Subscription $subscription, ?User $actor = null): Subscription
    {
        $subscription->forceFill(['status' => SubscriptionStatus::PastDue])->save();

        $this->audit->log('subscription.past_due', $subscription, [], $actor, $subscription->tenant_id);

        return $subscription;
    }

    /** Extend access while dunning — the tenant keeps working during grace. */
    public function enterGrace(Subscription $subscription, ?User $actor = null): Subscription
    {
        $days = (int) (app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('billing.grace_days') ?? config('platform.billing.grace_days', 7));

        $subscription->forceFill([
            'status' => SubscriptionStatus::GracePeriod,
            'grace_ends_at' => now()->addDays($days),
        ])->save();

        $this->audit->log('subscription.grace_started', $subscription, [
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
        ], $actor, $subscription->tenant_id);

        return $subscription;
    }

    public function suspend(Subscription $subscription, ?User $actor = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Suspended,
                'suspended_at' => now(),
            ])->save();

            $this->setTenantStatus($subscription, TenantStatus::Suspended);

            $this->audit->log('subscription.suspended', $subscription, [], $actor, $subscription->tenant_id);

            return $subscription->fresh();
        });
    }

    public function cancel(Subscription $subscription, ?User $actor = null): Subscription
    {
        $subscription->forceFill([
            'status' => SubscriptionStatus::Cancelled,
            'cancelled_at' => now(),
            'cancel_at_period_end' => false,
        ])->save();

        $this->audit->log('subscription.cancelled', $subscription, [], $actor, $subscription->tenant_id);

        return $subscription;
    }

    /** Cancel at the end of the paid period instead of immediately. */
    public function scheduleCancelAtPeriodEnd(Subscription $subscription, User $actor): Subscription
    {
        $subscription->forceFill(['cancel_at_period_end' => true])->save();

        $this->audit->log('subscription.cancel_scheduled', $subscription, [
            'ends_at' => $subscription->current_period_end?->toIso8601String(),
        ], $actor, $subscription->tenant_id);

        return $subscription;
    }

    /** Undo a scheduled cancellation (resume auto-renewal at period end). */
    public function resume(Subscription $subscription, ?User $actor = null): Subscription
    {
        $subscription->forceFill(['cancel_at_period_end' => false])->save();

        $this->audit->log('subscription.cancel_reverted', $subscription, [], $actor, $subscription->tenant_id);

        return $subscription;
    }

    /** Terminal state after the period ends for a scheduled cancellation. */
    public function expire(Subscription $subscription, ?User $actor = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Expired,
                'cancel_at_period_end' => false,
                'cancelled_at' => $subscription->cancelled_at ?? now(),
            ])->save();

            $this->setTenantStatus($subscription, TenantStatus::Suspended);

            $this->audit->log('subscription.expired', $subscription, [], $actor, $subscription->tenant_id);

            return $subscription->fresh();
        });
    }

    public function renew(Subscription $subscription, ?User $actor = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Active,
                'grace_ends_at' => null,
                'cancel_at_period_end' => false,
                'suspended_at' => null,
                'current_period_start' => now(),
                'current_period_end' => now()->addMonths($subscription->billing_cycle->months()),
            ])->save();

            $invoice = $this->issueInvoice($subscription);
            $this->payInvoice($invoice, $actor);

            $this->setTenantStatus($subscription, TenantStatus::Active);

            $this->audit->log('subscription.renewed', $subscription, ['invoice' => $invoice->number], $actor, $subscription->tenant_id);

            return $subscription->fresh();
        });
    }

    /** Retry a failed renewal — same effect as renew, from the failed-renewals view. */
    public function retryRenewal(Subscription $subscription, User $actor): Subscription
    {
        return $this->renew($subscription, $actor);
    }

    /**
     * Apply a provider-confirmed renewal: advance the period (using the
     * provider's own period when supplied) and issue the renewal invoice. The
     * capturing payment is recorded separately by the caller.
     */
    public function applyProviderRenewal(Subscription $subscription, ?Carbon $periodStart = null, ?Carbon $periodEnd = null, ?User $actor = null): SubscriptionInvoice
    {
        return DB::transaction(function () use ($subscription, $periodStart, $periodEnd, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Active,
                'grace_ends_at' => null,
                'suspended_at' => null,
                'cancel_at_period_end' => false,
                'current_period_start' => $periodStart ?? now(),
                'current_period_end' => $periodEnd ?? now()->addMonths($subscription->billing_cycle->months()),
            ])->save();

            $this->setTenantStatus($subscription, TenantStatus::Active);

            $invoice = $this->issueInvoice($subscription);

            $this->audit->log('subscription.renewed', $subscription, [
                'source' => 'provider',
                'invoice' => $invoice->number,
            ], $actor, $subscription->tenant_id);

            return $invoice;
        });
    }

    /**
     * Issue a renewal invoice for a manual-renewal gateway (bKash / SSLCOMMERZ):
     * the tenant pays it with a fresh checkout. Idempotent per open period.
     */
    public function issueRenewalInvoice(Subscription $subscription): ?SubscriptionInvoice
    {
        $existing = $subscription->invoices()
            ->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::Open->value, InvoiceStatus::PartiallyPaid->value, InvoiceStatus::Overdue->value])
            ->where('period_end', '>=', $subscription->current_period_end ?? now())
            ->latest('id')
            ->first();

        if ($existing) {
            return null;
        }

        return $this->issueInvoice($subscription);
    }

    public function issueInvoice(Subscription $subscription): SubscriptionInvoice
    {
        $price = $this->pricing->subscriptionPrice($subscription);
        $subtotal = $price['amount'];

        $discount = 0.0;
        $couponCode = null;

        $coupon = $subscription->coupon;

        if (! $coupon) {
            $coupon = $this->coupons->bestAutoApply($subscription->plan, $subscription->tenant, $subtotal);

            if ($coupon) {
                $this->coupons->redeem($coupon, $subscription->tenant, $subscription, $coupon->discountFor($subtotal));
            }
        }

        if ($coupon) {
            $discount = $coupon->discountFor($subtotal);
            $couponCode = $coupon->code;
        }

        return DB::transaction(function () use ($subscription, $subtotal, $discount, $couponCode, $price) {
            $prefix = (string) (app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('billing.invoice_prefix') ?? 'INV');

            $invoice = SubscriptionInvoice::create([
                'tenant_id' => $subscription->tenant_id,
                'subscription_id' => $subscription->getKey(),
                'number' => $this->numbers->next($subscription->tenant_id, 'subscription_invoice', $prefix),
                'subtotal' => $subtotal,
                'discount_amount' => $discount,
                'coupon_code' => $couponCode,
                'amount' => round($subtotal - $discount, 2),
                'currency' => $price['currency'],
                'status' => InvoiceStatus::Open,
                'period_start' => $subscription->current_period_start ?? now(),
                'period_end' => $subscription->current_period_end ?? now()->addMonth(),
                'issued_at' => now(),
                'due_date' => ($subscription->current_period_start ?? now())->copy()->addDays(14),
                'billing_snapshot' => $this->billingSnapshot($subscription->tenant),
            ]);

            $invoice->items()->create([
                'description' => ($subscription->plan?->name ?? 'Subscription').' — '.ucfirst($subscription->billing_cycle->value).' subscription',
                'quantity' => 1,
                'unit_price' => $subtotal,
                'amount' => $subtotal,
                'sort_order' => 0,
            ]);

            return $invoice;
        });
    }

    public function payInvoice(SubscriptionInvoice $invoice, ?User $actor = null): SubscriptionInvoice
    {
        $invoice->forceFill([
            'status' => InvoiceStatus::Paid,
            'paid_at' => now(),
        ])->save();

        $this->audit->log('subscription.invoice_paid', $invoice, ['number' => $invoice->number], $actor, $invoice->tenant_id);

        return $invoice;
    }

    /** Apply a coupon to a subscription and record the redemption once. */
    public function applyCoupon(Subscription $subscription, string $code, User $actor): Coupon
    {
        $coupon = $this->coupons->findValid($code, $subscription->plan, $subscription->tenant);

        if (! $coupon) {
            throw ValidationException::withMessages([
                'code' => 'This coupon is not valid for this subscription.',
            ]);
        }

        $price = $this->pricing->subscriptionPrice($subscription);
        $discount = $coupon->discountFor($price['amount']);

        return DB::transaction(function () use ($subscription, $coupon, $discount, $actor) {
            $subscription->forceFill(['coupon_id' => $coupon->getKey()])->save();
            $this->coupons->redeem($coupon, $subscription->tenant, $subscription, $discount);
            $this->coupons->logApplied($coupon, $subscription, $discount, $actor);

            return $coupon;
        });
    }

    public function removeCoupon(Subscription $subscription, User $actor): Subscription
    {
        $subscription->forceFill(['coupon_id' => null])->save();

        $this->audit->log('subscription.coupon_removed', $subscription, [], $actor, $subscription->tenant_id);

        return $subscription;
    }

    /**
     * Immutable snapshot of the tenant's billing details at issue time, so a
     * historical invoice keeps the details it was billed to.
     *
     * @return array<string, mixed>
     */
    protected function billingSnapshot(?Tenant $tenant): array
    {
        if (! $tenant) {
            return [];
        }

        return array_filter([
            'name' => $tenant->getSetting('billing.name', $tenant->getSetting('company.legal_name', $tenant->name)),
            'email' => $tenant->getSetting('billing.email', $tenant->getSetting('company.email', $tenant->business_email)),
            'country' => $tenant->getSetting('billing.country', $tenant->getSetting('region.country')),
            'address' => $tenant->getSetting('billing.address', $tenant->getSetting('company.address')),
            'city' => $tenant->getSetting('billing.city'),
            'postal_code' => $tenant->getSetting('billing.postal_code'),
            'tax_id' => $tenant->getSetting('billing.tax_id', $tenant->getSetting('company.tax_id')),
            'captured_at' => now()->toIso8601String(),
        ], fn ($value) => $value !== null && $value !== '');
    }

    protected function setTenantStatus(Subscription $subscription, TenantStatus $status): void
    {
        $tenant = $subscription->tenant;

        if (! $tenant) {
            return;
        }

        $tenant->forceFill([
            'status' => $status,
            'suspended_at' => $status === TenantStatus::Suspended ? now() : null,
        ])->save();
    }
}
