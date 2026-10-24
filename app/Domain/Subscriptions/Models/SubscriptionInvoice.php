<?php

namespace App\Domain\Subscriptions\Models;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\BillingAdjustment;
use App\Domain\Billing\Models\CreditNote;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\Models\SubscriptionInvoiceItem;
use App\Domain\Subscriptions\Enums\InvoiceStatus;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionInvoice extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'number',
        'amount',
        'subtotal',
        'discount_amount',
        'coupon_code',
        'currency',
        'status',
        'period_start',
        'period_end',
        'issued_at',
        'paid_at',
        'provider_ref',
        'billing_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'status' => InvoiceStatus::class,
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'issued_at' => 'datetime',
            'paid_at' => 'datetime',
            'billing_snapshot' => 'array',
        ];
    }

    /** The capturing payment (gateway + transaction reference), if any. */
    public function latestSuccessfulPayment(): ?PlatformPayment
    {
        return $this->platformPayments()
            ->where('status', PlatformPaymentStatus::Succeeded->value)
            ->latest('id')
            ->first();
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubscriptionInvoiceItem::class, 'subscription_invoice_id');
    }

    public function creditNotes(): HasMany
    {
        return $this->hasMany(CreditNote::class, 'subscription_invoice_id');
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(BillingAdjustment::class, 'subscription_invoice_id');
    }

    public function platformPayments(): HasMany
    {
        return $this->hasMany(PlatformPayment::class, 'subscription_invoice_id');
    }

    public function outstandingAmount(): float
    {
        $discount = (float) ($this->discount_amount ?? 0);
        $paid = (float) $this->platformPayments()->where('status', 'succeeded')->sum('amount');

        return max(0, round((float) $this->subtotal - $discount - $paid, 2));
    }
}
