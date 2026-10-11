<?php

namespace App\Domain\Billing\Models;

use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A manual billing adjustment (debit increases, credit reduces the balance). */
class BillingAdjustment extends Model
{
    protected $fillable = [
        'tenant_id',
        'subscription_invoice_id',
        'type',
        'amount',
        'currency',
        'reason',
        'created_by',
        'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'applied_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SubscriptionInvoice::class, 'subscription_invoice_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
