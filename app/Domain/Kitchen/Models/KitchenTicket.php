<?php

namespace App\Domain\Kitchen\Models;

use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KitchenTicket extends Model
{
    use BelongsToTenant, BelongsToBranch;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'order_id',
        'status',
        'priority',
        'notes',
        'accepted_at',
        'ready_at',
        'handed_over_at',
        'served_at',
        'cancelled_at',
        'printed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => KitchenTicketStatus::class,
            'accepted_at' => 'datetime',
            'ready_at' => 'datetime',
            'handed_over_at' => 'datetime',
            'served_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'printed_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(KitchenTicketItem::class);
    }

    public function elapsedMinutes(): int
    {
        return (int) $this->created_at?->diffInMinutes(now());
    }
}
