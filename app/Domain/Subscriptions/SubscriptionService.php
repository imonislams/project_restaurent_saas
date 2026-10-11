<?php

namespace App\Domain\Subscriptions;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Documents\DocumentNumberGenerator;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\InvoiceStatus;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Subscription lifecycle. Entitlements are always resolved here on the server
 * from the stored subscription — never from a client-supplied plan.
 */
class SubscriptionService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected AuditLogger $audit,
    ) {}

    public function startTrial(Tenant $tenant, ?Plan $plan = null): ?Subscription
    {
        $plan ??= Plan::query()->where('is_active', true)->orderBy('sort_order')->first();

        if (! $plan) {
            return null;
        }

        $days = $plan->trial_days > 0 ? $plan->trial_days : 14;

        return Subscription::updateOrCreate(
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
            ],
        );
    }

    public function changePlan(Subscription $subscription, Plan $plan, BillingCycle $cycle, User $actor): Subscription
    {
        $subscription->forceFill([
            'plan_id' => $plan->getKey(),
            'billing_cycle' => $cycle,
        ])->save();

        $this->audit->log('subscription.plan_changed', $subscription, [
            'plan' => $plan->name,
            'cycle' => $cycle->value,
        ], $actor, $subscription->tenant_id);

        return $subscription->fresh('plan');
    }

    public function activate(Subscription $subscription, ?User $actor = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Active,
                'suspended_at' => null,
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
        ])->save();

        $this->audit->log('subscription.cancelled', $subscription, [], $actor, $subscription->tenant_id);

        return $subscription;
    }

    public function renew(Subscription $subscription, ?User $actor = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $actor) {
            $subscription->forceFill([
                'status' => SubscriptionStatus::Active,
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

    public function issueInvoice(Subscription $subscription): SubscriptionInvoice
    {
        return SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->getKey(),
            'number' => $this->numbers->next($subscription->tenant_id, 'subscription_invoice', 'INV'),
            'amount' => $subscription->billing_cycle->priceFor($subscription->plan),
            'currency' => $subscription->tenant?->getSetting('region.currency', 'USD') ?? 'USD',
            'status' => InvoiceStatus::Open,
            'period_start' => $subscription->current_period_start ?? now(),
            'period_end' => $subscription->current_period_end ?? now()->addMonth(),
            'issued_at' => now(),
        ]);
    }

    public function payInvoice(SubscriptionInvoice $invoice, User $actor): SubscriptionInvoice
    {
        $invoice->forceFill([
            'status' => InvoiceStatus::Paid,
            'paid_at' => now(),
        ])->save();

        $this->audit->log('subscription.invoice_paid', $invoice, ['number' => $invoice->number], $actor, $invoice->tenant_id);

        return $invoice;
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
