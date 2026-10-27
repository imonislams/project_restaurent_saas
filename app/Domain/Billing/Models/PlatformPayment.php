<?php

namespace App\Domain\Billing\Models;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A platform payment attempt against a subscription invoice. Marked successful
 * only after the gateway transaction has been verified server-side.
 */
class PlatformPayment extends Model
{
    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'subscription_invoice_id',
        'gateway',
        'provider_ref',
        'amount',
        'currency',
        'status',
        'attempt_number',
        'failure_reason',
        'paid_at',
        'confirmed_by',
        'confirmed_at',
        'confirmation_note',
        'settlement_status',
        'refunded_amount',
        'idempotency_key',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'status' => PlatformPaymentStatus::class,
            'amount' => 'decimal:2',
            'refunded_amount' => 'decimal:2',
            'attempt_number' => 'integer',
            'paid_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SubscriptionInvoice::class, 'subscription_invoice_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(PlatformPaymentAttempt::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(PlatformRefund::class);
    }

    public function refundableAmount(): float
    {
        return round((float) $this->amount - (float) $this->refunded_amount, 2);
    }
}
