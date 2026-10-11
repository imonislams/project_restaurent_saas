<?php

namespace App\Domain\Purchasing\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class GoodsReceiptItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'goods_receipt_id',
        'purchase_order_item_id',
        'item_type',
        'item_id',
        'quantity',
        'rejected_quantity',
        'unit_cost',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'rejected_quantity' => 'decimal:3',
            'unit_cost' => 'decimal:4',
        ];
    }

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class, 'goods_receipt_id');
    }

    public function purchaseOrderItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderItem::class);
    }

    public function item(): MorphTo
    {
        return $this->morphTo();
    }
}
