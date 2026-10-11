<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use BelongsToTenant;

    protected static function booted(): void
    {
        // Any change to a subscription invalidates the tenant's cached plan.
        static::saved(fn (self $subscription) => Tenant::forgetEntitlementCache($subscription->tenant_id));
        static::deleted(fn (self $subscription) => Tenant::forgetEntitlementCache($subscription->tenant_id));
    }

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'coupon_id',
        'status',
        'billing_cycle',
        'trial_ends_at',
        'current_period_start',
        'current_period_end',
        'grace_ends_at',
        'cancel_at_period_end',
        'cancelled_at',
        'suspended_at',
        'provider',
        'provider_ref',
        'plan_snapshot',
        'plan_version',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'billing_cycle' => BillingCycle::class,
            'trial_ends_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'grace_ends_at' => 'datetime',
            'cancel_at_period_end' => 'boolean',
            'cancelled_at' => 'datetime',
            'suspended_at' => 'datetime',
            'plan_snapshot' => 'array',
            'plan_version' => 'integer',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    /** Immutable snapshot of the plan terms agreed at subscription time. */
    public function snapshotPlan(Plan $plan): void
    {
        $this->plan_snapshot = [
            'name' => $plan->name,
            'currency' => $plan->currency,
            'price_monthly' => (float) $plan->price_monthly,
            'price_yearly' => (float) $plan->price_yearly,
            'trial_days' => $plan->trial_days,
            'features' => $plan->features ?? [],
            'limits' => $plan->limits ?? [],
            'version' => $plan->version,
            'captured_at' => now()->toIso8601String(),
        ];
        $this->plan_version = $plan->version;
    }

    /** Plan terms as agreed — the snapshot when present, else the live plan. */
    public function effectiveTerms(): array
    {
        if ($this->plan_snapshot) {
            return $this->plan_snapshot;
        }

        $plan = $this->plan;

        return $plan ? [
            'name' => $plan->name,
            'currency' => $plan->currency,
            'price_monthly' => (float) $plan->price_monthly,
            'price_yearly' => (float) $plan->price_yearly,
            'trial_days' => $plan->trial_days,
            'features' => $plan->features ?? [],
            'limits' => $plan->limits ?? [],
            'version' => $plan->version,
        ] : [];
    }

    public function isActive(): bool
    {
        return $this->status->grantsAccess();
    }

    public function onTrial(): bool
    {
        return $this->status === SubscriptionStatus::Trialing && $this->trial_ends_at?->isFuture();
    }

    public function inGracePeriod(): bool
    {
        return $this->status === SubscriptionStatus::GracePeriod;
    }

    public function daysRemaining(): ?int
    {
        $end = $this->status === SubscriptionStatus::Trialing ? $this->trial_ends_at : $this->current_period_end;

        return $end ? max(0, (int) now()->diffInDays($end, false)) : null;
    }
}
