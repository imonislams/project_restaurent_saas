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
        'status',
        'billing_cycle',
        'trial_ends_at',
        'current_period_start',
        'current_period_end',
        'cancelled_at',
        'suspended_at',
        'provider',
        'provider_ref',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'billing_cycle' => BillingCycle::class,
            'trial_ends_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'cancelled_at' => 'datetime',
            'suspended_at' => 'datetime',
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

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class);
    }

    public function isActive(): bool
    {
        return $this->status->grantsAccess();
    }

    public function onTrial(): bool
    {
        return $this->status === SubscriptionStatus::Trialing && $this->trial_ends_at?->isFuture();
    }

    public function daysRemaining(): ?int
    {
        $end = $this->status === SubscriptionStatus::Trialing ? $this->trial_ends_at : $this->current_period_end;

        return $end ? max(0, (int) now()->diffInDays($end, false)) : null;
    }
}
