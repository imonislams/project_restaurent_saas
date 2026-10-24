<?php

namespace App\Domain\Invoicing\Models;

use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Invoicing\Enums\InvoiceStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use BelongsToTenant, BelongsToBranch, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'table_id',
        'dining_session_id',
        'dining_participant_id',
        'customer_id',
        'number',
        'status',
        'subtotal',
        'discount_total',
        'tax_total',
        'service_charge',
        'total',
        'paid_total',
        'currency',
        'issued_at',
        'finalized_at',
        'paid_at',
        'voided_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => InvoiceStatus::class,
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'service_charge' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_total' => 'decimal:2',
            'issued_at' => 'datetime',
            'finalized_at' => 'datetime',
            'paid_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function diningSession(): BelongsTo
    {
        return $this->belongsTo(DiningSession::class, 'dining_session_id');
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(DiningParticipant::class, 'dining_participant_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The orders rolled into this invoice, with the amount each contributed.
     */
    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(Order::class, 'invoice_orders')
            ->withPivot(['amount', 'tenant_id'])
            ->withTimestamps();
    }

    public function outstanding(): float
    {
        return round(max(0.0, (float) $this->total - (float) $this->paid_total), 2);
    }

    public function isEditable(): bool
    {
        return $this->status->isEditable();
    }
}
