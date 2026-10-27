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

    /**
     * Immediate, direct plan switch — used for platform-admin / comped changes.
     * The tenant self-service flow goes through requestPlanChange() so the new
     * plan is not activated until its invoice is paid.
     */
    public function changePlan(Subscription $subscription, Plan $plan, BillingCycle $cycle, User $actor): Subscription
    {
        if ($plan->isArchived()) {
            throw ValidationException::withMessages(['plan_id' => 'This plan is archived and cannot be assigned.']);
        }

        $subscription->forceFill([
            'plan_id' => $plan->getKey(),
            'billing_cycle' => $cycle,
            // An immediate change supersedes any pending self-service request.
            'pending_plan_id' => null,
            'pending_billing_cycle' => null,
            'pending_invoice_id' => null,
            'pending_since' => null,
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

    /**
     * Request a plan change without activating it: the target plan/cycle is held
     * as pending and an invoice is issued for it. The live plan is only switched
     * once that invoice is settled (see payInvoice → applyPendingPlanChange).
     */
    public function requestPlanChange(Subscription $subscription, Plan $plan, BillingCycle $cycle, User $actor): SubscriptionInvoice
    {
        if ($plan->isArchived()) {
            throw ValidationException::withMessages(['plan_id' => 'This plan is archived and cannot be assigned.']);
        }

        // Idempotent: reuse the outstanding invoice when the same change is pending.
        $existing = $subscription->pendingInvoice;

        if ((int) $subscription->pending_plan_id === (int) $plan->getKey()
            && $subscription->pending_billing_cycle === $cycle
            && $existing
            && ! $existing->status->isSettled()) {
            return $existing;
        }

        return DB::transaction(function () use ($subscription, $plan, $cycle, $actor) {
            $subscription->forceFill([
                'pending_plan_id' => $plan->getKey(),
                'pending_billing_cycle' => $cycle,
                'pending_since' => now(),
            ])->save();

            $invoice = $this->issueInvoice($subscription, $plan, $cycle);

            $subscription->forceFill(['pending_invoice_id' => $invoice->getKey()])->save();

            $this->audit->log('subscription.plan_change_requested', $subscription, [
                'plan' => $plan->name,
                'cycle' => $cycle->value,
                'plan_version' => $plan->version,
                'invoice' => $invoice->number,
            ], $actor, $subscription->tenant_id);

            return $invoice;
        });
    }

    /**
     * Activate a requested plan change once its invoice is settled: switch the
     * live plan/cycle, re-capture the agreed terms, and start the paid period.
     */
    public function applyPendingPlanChange(Subscription $subscription, ?User $actor = null): Subscription
    {
        if (! $subscription->hasPendingPlanChange()) {
            return $subscription;
        }

        $plan = Plan::query()->find($subscription->pending_plan_id);

        if (! $plan) {
            // The target plan is gone — drop the request rather than half-apply it.
            $subscription->clearPendingPlanChange();

            return $subscription;
        }

        $cycle = $subscription->pending_billing_cycle ?? $subscription->billing_cycle;
        $invoice = $subscription->pendingInvoice;

        return DB::transaction(function () use ($subscription, $plan, $cycle, $invoice, $actor) {
            $subscription->forceFill([
                'plan_id' => $plan->getKey(),
                'billing_cycle' => $cycle,
                'status' => SubscriptionStatus::Active,
                'suspended_at' => null,
                'grace_ends_at' => null,
                'cancel_at_period_end' => false,
                'current_period_start' => $invoice?->period_start ?? now(),
                'current_period_end' => $invoice?->period_end ?? now()->addMonths($cycle->months()),
                'pending_plan_id' => null,
                'pending_billing_cycle' => null,
                'pending_invoice_id' => null,
                'pending_since' => null,
            ]);

            $subscription->snapshotPlan($plan);
            $subscription->save();

            $this->setTenantStatus($subscription, TenantStatus::Active);

            $this->audit->log('subscription.plan_changed', $subscription, [
                'plan' => $plan->name,
                'cycle' => $cycle->value,
                'plan_version' => $plan->version,
                'source' => 'payment',
            ], $actor, $subscription->tenant_id);

            return $subscription->fresh('plan');
        });
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

            // Billing state only: the account stays active so the owner can still
            // sign in and pay. Access is closed by EnsureSubscriptionAccess; an
            // account-level suspension is a separate, deliberate admin action.
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

            // Billing state only — see suspend(): the tenant keeps its login and can
            // reach the Subscription page to renew.
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

    /**
     * Issue an invoice for a subscription's agreed period. Pass an explicit
     * plan/cycle to bill a requested plan change while the subscription itself
     * still points at its current plan.
     */
    public function issueInvoice(Subscription $subscription, ?Plan $plan = null, ?BillingCycle $cycle = null): SubscriptionInvoice
    {
        $plan ??= $subscription->plan;
        $cycle ??= $subscription->billing_cycle;

        $price = $this->pricing->subscriptionPrice($subscription, $plan, $cycle);
        $subtotal = $price['amount'];

        $discount = 0.0;
        $couponCode = null;

        $coupon = $subscription->coupon;

        if (! $coupon && $plan) {
            $coupon = $this->coupons->bestAutoApply($plan, $subscription->tenant, $subtotal);

            if ($coupon) {
                $this->coupons->redeem($coupon, $subscription->tenant, $subscription, $coupon->discountFor($subtotal));
            }
        }

        if ($coupon) {
            $discount = $coupon->discountFor($subtotal);
            $couponCode = $coupon->code;
        }

        return DB::transaction(function () use ($subscription, $plan, $cycle, $subtotal, $discount, $couponCode, $price) {
            $prefix = (string) (app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('billing.invoice_prefix') ?? 'INV');

            $invoice = SubscriptionInvoice::create([
                'tenant_id' => $subscription->tenant_id,
                'subscription_id' => $subscription->getKey(),
                'plan_id' => $plan?->getKey(),
                'billing_cycle' => $cycle,
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
                'description' => ($plan?->name ?? 'Subscription').' — '.ucfirst($cycle->value).' subscription',
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

        // Settling the invoice for a pending plan change is what activates it.
        $subscription = $invoice->subscription;

        if ($subscription
            && $subscription->pending_invoice_id !== null
            && (int) $subscription->pending_invoice_id === (int) $invoice->getKey()) {
            $this->applyPendingPlanChange($subscription, $actor);
        } elseif ($subscription && ! $subscription->isActive()) {
            // Paying a lapsed subscription's invoice restores access (suspension,
            // expiry or a cancelled plan), so the tenant is never stuck locked out
            // after paying.
            $this->restoreAfterPayment($subscription, $invoice, $actor);
        }

        return $invoice;
    }

    /**
     * Reactivate a lapsed subscription whose invoice has just been settled.
     */
    protected function restoreAfterPayment(Subscription $subscription, SubscriptionInvoice $invoice, ?User $actor = null): Subscription
    {
        $subscription->forceFill([
            'status' => SubscriptionStatus::Active,
            'grace_ends_at' => null,
            'suspended_at' => null,
            'cancel_at_period_end' => false,
            'current_period_start' => $invoice->period_start ?? now(),
            'current_period_end' => $invoice->period_end ?? now()->addMonths($subscription->billing_cycle->months()),
        ])->save();

        $this->setTenantStatus($subscription, TenantStatus::Active);

        $this->audit->log('subscription.reactivated', $subscription, [
            'invoice' => $invoice->number,
        ], $actor, $subscription->tenant_id);

        return $subscription->fresh();
    }

    /**
     * Start a subscription for a tenant that has none (e.g. registration found no
     * plan, or the previous subscription was removed). No access is granted until
     * the first invoice is settled.
     */
    public function startSubscription(Tenant $tenant, Plan $plan, BillingCycle $cycle, ?User $actor = null): SubscriptionInvoice
    {
        return DB::transaction(function () use ($tenant, $plan, $cycle, $actor) {
            $subscription = Subscription::updateOrCreate(
                ['tenant_id' => $tenant->getKey()],
                [
                    'plan_id' => $plan->getKey(),
                    'billing_cycle' => $cycle,
                    'status' => SubscriptionStatus::Suspended,
                    'current_period_start' => now(),
                    'current_period_end' => now(),
                    'suspended_at' => now(),
                    'cancel_at_period_end' => false,
                    'cancelled_at' => null,
                    'grace_ends_at' => null,
                    'pending_plan_id' => $plan->getKey(),
                    'pending_billing_cycle' => $cycle,
                    'pending_since' => now(),
                ],
            );

            $invoice = $this->issueInvoice($subscription, $plan, $cycle);

            $subscription->forceFill(['pending_invoice_id' => $invoice->getKey()])->save();

            $this->audit->log('subscription.started', $subscription, [
                'plan' => $plan->name,
                'invoice' => $invoice->number,
            ], $actor, $tenant->getKey());

            return $invoice;
        });
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
