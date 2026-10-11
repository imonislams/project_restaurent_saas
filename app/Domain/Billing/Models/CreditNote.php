<?php

namespace App\Domain\Billing\Models;

use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A credit note reduces the amount owed on an invoice. Finalized financial
 * documents are corrected through credit notes, never by rewriting them.
 */
class CreditNote extends Model
{
    protected $fillable = [
        'tenant_id',
        'subscription_invoice_id',
        'number',
        'amount',
        'currency',
        'reason',
        'status',
        'issued_by',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'issued_at' => 'datetime',
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

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
