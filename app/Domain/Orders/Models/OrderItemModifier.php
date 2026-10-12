<?php

namespace App\Domain\Orders\Models;

use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Snapshot of a chosen modifier on an order line. The name and price delta are
 * denormalized so history survives menu edits.
 */
class OrderItemModifier extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'order_item_id',
        'modifier_option_id',
        'group_name',
        'name',
        'price_delta',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'price_delta' => 'decimal:2',
            'quantity' => 'decimal:3',
        ];
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(ModifierOption::class, 'modifier_option_id');
    }
}
