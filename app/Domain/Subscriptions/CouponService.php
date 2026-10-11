<?php

namespace App\Domain\Subscriptions;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Subscriptions\Models\Coupon;
use App\Domain\Subscriptions\Models\CouponRedemption;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;

/**
 * Coupon validation and redemption. Redemption is recorded once per tenant so a
 * code cannot be applied twice to the same account.
 */
class CouponService
{
    public function __construct(protected AuditLogger $audit) {}

    public function findValid(string $code, ?Plan $plan = null, ?Tenant $tenant = null, ?float $amount = null): ?Coupon
    {
        $coupon = Coupon::query()->where('code', strtoupper(trim($code)))->first();

        if (! $coupon || ! $coupon->isRedeemable($tenant)) {
            return null;
        }

        if ($plan && ! $coupon->appliesTo($plan)) {
            return null;
        }

        if (! $this->qualifies($coupon, $amount, $tenant)) {
            return null;
        }

        return $coupon;
    }

    /**
     * The best auto-applicable coupon for a plan/tenant/amount, or null.
     */
    public function bestAutoApply(?Plan $plan, ?Tenant $tenant, float $amount): ?Coupon
    {
        if (! $plan || ! $tenant) {
            return null;
        }

        return Coupon::query()
            ->where('is_active', true)
            ->where('auto_apply', true)
            ->get()
            ->filter(fn (Coupon $coupon) => $coupon->isRedeemable($tenant)
                && $coupon->appliesTo($plan)
                && $this->qualifies($coupon, $amount, $tenant))
            ->sortByDesc(fn (Coupon $coupon) => $coupon->discountFor($amount))
            ->first();
    }

    /** Whether a coupon's minimum amount and first-purchase rules are met. */
    public function qualifies(Coupon $coupon, ?float $amount, ?Tenant $tenant): bool
    {
        if ($coupon->min_amount !== null && $amount !== null && $amount < (float) $coupon->min_amount) {
            return false;
        }

        if ($coupon->first_purchase_only && $tenant !== null) {
            $paid = $tenant->subscription?->invoices()->where('status', 'paid')->exists() ?? false;

            if ($paid) {
                return false;
            }
        }

        return true;
    }

    public function redeem(Coupon $coupon, Tenant $tenant, ?Subscription $subscription, float $amount): CouponRedemption
    {
        if ($coupon->max_redemptions !== null && $coupon->redeemed_count >= $coupon->max_redemptions) {
            // Guard against a race between validation and redemption.
            abort(422, 'This coupon has reached its redemption limit.');
        }

        $redemption = $coupon->redemptions()->create([
            'tenant_id' => $tenant->getKey(),
            'subscription_id' => $subscription?->getKey(),
            'amount' => round($amount, 2),
            'redeemed_at' => now(),
        ]);

        $coupon->increment('redeemed_count');

        return $redemption;
    }

    public function logApplied(Coupon $coupon, Subscription $subscription, float $discount, User $actor): void
    {
        $this->audit->log('subscription.coupon_applied', $subscription, [
            'code' => $coupon->code,
            'discount' => $discount,
        ], $actor, $subscription->tenant_id);
    }
}
