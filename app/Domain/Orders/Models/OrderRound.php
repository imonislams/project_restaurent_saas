<?php

namespace App\Domain\Orders\Models;

use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One submission of items inside an order. Round 1 is the original order; each
 * additional submission becomes the next round with its own acceptance state
 * and kitchen ticket. The order remains the single billing unit.
 */
class OrderRound extends Model
{
    use BelongsToBranch, BelongsToTenant;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'order_id',
        'round_no',
        'source',
        'dining_participant_id',
        'requested_by_user_id',
        'idempotency_key',
        'status',
        'acceptance_status',
        'accepted_at',
        'accepted_by_user_id',
        'rejected_at',
        'rejected_by_user_id',
        'rejected_reason',
        'sent_to_kitchen_at',
        'kitchen_ticket_id',
        'subtotal',
        'discount_total',
        'tax_total',
        'service_charge',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'round_no' => 'integer',
            'source' => OrderSource::class,
            'acceptance_status' => AcceptanceStatus::class,
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
            'sent_to_kitchen_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'service_charge' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function kitchenTicket(): BelongsTo
    {
        return $this->belongsTo(KitchenTicket::class);
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(DiningParticipant::class, 'dining_participant_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }
}
