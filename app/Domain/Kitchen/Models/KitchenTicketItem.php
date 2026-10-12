<?php

namespace App\Domain\Kitchen\Models;

use App\Domain\Kitchen\Enums\KitchenItemStatus;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KitchenTicketItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'kitchen_ticket_id',
        'order_item_id',
        'station_id',
        'name',
        'quantity',
        'status',
        'notes',
        'modifiers',
    ];

    protected function casts(): array
    {
        return [
            'status' => KitchenItemStatus::class,
            'quantity' => 'decimal:3',
            'modifiers' => 'array',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(KitchenTicket::class, 'kitchen_ticket_id');
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(KitchenStation::class, 'station_id');
    }
}
