<?php

namespace App\Domain\Purchasing\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Purchasing\Enums\PurchaseOrderStatus;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use BelongsToTenant, BelongsToBranch, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'supplier_id',
        'number',
        'status',
        'subtotal',
        'total',
        'notes',
        'created_by',
        'approved_by',
        'ordered_at',
        'approved_at',
        'expected_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => PurchaseOrderStatus::class,
            'subtotal' => 'decimal:2',
            'total' => 'decimal:2',
            'ordered_at' => 'datetime',
            'approved_at' => 'datetime',
            'expected_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(GoodsReceipt::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function fullyReceived(): bool
    {
        return $this->items()->whereColumn('received_quantity', '<', 'quantity')->doesntExist();
    }

    public function paidTotal(): float
    {
        return (float) $this->payments()->sum('amount');
    }
}
