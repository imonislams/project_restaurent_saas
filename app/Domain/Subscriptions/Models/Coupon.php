<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Subscriptions\Enums\CouponType;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'type',
        'value',
        'currency',
        'max_redemptions',
        'redeemed_count',
        'applies_to_plan_id',
        'applies_to_plan_ids',
        'valid_from',
        'valid_to',
        'is_active',
        'auto_apply',
        'first_purchase_only',
        'min_amount',
        'per_tenant_limit',
    ];

    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'value' => 'decimal:2',
            'max_redemptions' => 'integer',
            'redeemed_count' => 'integer',
            'valid_from' => 'datetime',
            'valid_to' => 'datetime',
            'is_active' => 'boolean',
            'auto_apply' => 'boolean',
            'first_purchase_only' => 'boolean',
            'min_amount' => 'decimal:2',
            'per_tenant_limit' => 'integer',
            'applies_to_plan_ids' => 'array',
        ];
    }

    public function appliesToPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'applies_to_plan_id');
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function isExhausted(): bool
    {
        return $this->max_redemptions !== null && $this->redeemed_count >= $this->max_redemptions;
    }

    public function isWithinWindow(?Carbon $at = null): bool
    {
        $at ??= now();

        if ($this->valid_from && $at->lessThan($this->valid_from)) {
            return false;
        }

        if ($this->valid_to && $at->greaterThan($this->valid_to)) {
            return false;
        }

        return true;
    }

    public function appliesTo(Plan $plan): bool
    {
        if (is_array($this->applies_to_plan_ids) && $this->applies_to_plan_ids !== []
            && ! in_array($plan->getKey(), array_map('intval', $this->applies_to_plan_ids), true)) {
            return false;
        }

        return $this->applies_to_plan_id === null || $this->applies_to_plan_id === $plan->getKey();
    }

    public function isRedeemable(?Tenant $tenant = null): bool
    {
        if (! $this->is_active || $this->isExhausted() || ! $this->isWithinWindow()) {
            return false;
        }

        if ($tenant !== null) {
            $limit = $this->per_tenant_limit ?? 1;
            $used = $this->redemptions()->where('tenant_id', $tenant->getKey())->count();

            if ($used >= $limit) {
                return false;
            }
        }

        return true;
    }

    /** Discount for a given amount (in the coupon's currency, or percent). */
    public function discountFor(float $amount): float
    {
        $discount = $this->type === CouponType::Percent
            ? $amount * ((float) $this->value / 100)
            : (float) $this->value;

        return round(min($discount, $amount), 2);
    }
}
