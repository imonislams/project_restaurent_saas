<?php

namespace App\Domain\Orders\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Register;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Payments\Models\Payment;
use App\Domain\Tables\Models\Table;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use BelongsToTenant, BelongsToBranch, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'shift_id',
        'register_id',
        'table_id',
        'dining_session_id',
        'dining_participant_id',
        'delivery_zone_id',
        'customer_id',
        'user_id',
        'order_number',
        'order_type',
        'source',
        'status',
        'acceptance_status',
        'fulfillment_status',
        'customer_name',
        'covers',
        'delivery_address',
        'driver_name',
        'driver_phone',
        'notes',
        'subtotal',
        'discount_type',
        'discount_value',
        'discount_total',
        'tax_total',
        'service_charge',
        'delivery_fee',
        'total',
        'paid_total',
        'change_due',
        'currency',
        'idempotency_key',
        'placed_at',
        'completed_at',
        'accepted_at',
        'rejected_at',
        'rejected_reason',
        'confirmed_by_user_id',
        'rejected_by_user_id',
        'voided_at',
    ];

    protected function casts(): array
    {
        return [
            'order_type' => OrderType::class,
            'source' => OrderSource::class,
            'status' => OrderStatus::class,
            'acceptance_status' => AcceptanceStatus::class,
            'fulfillment_status' => FulfillmentStatus::class,
            'covers' => 'integer',
            'subtotal' => 'decimal:2',
            'discount_value' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'service_charge' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_total' => 'decimal:2',
            'change_due' => 'decimal:2',
            'placed_at' => 'datetime',
            'completed_at' => 'datetime',
            'accepted_at' => 'datetime',
            'rejected_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
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

    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function kitchenTicket(): HasOne
    {
        return $this->hasOne(KitchenTicket::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by_user_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by_user_id');
    }

    /**
     * Staff snapshot: the table's assigned staff captured when the order was
     * opened. Frozen at creation — later table assignment changes never
     * rewrite this history.
     */
    public function staff(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'order_staff')
            ->withPivot('name', 'tenant_id')
            ->withTimestamps();
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === OrderStatus::Completed;
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [OrderStatus::Draft, OrderStatus::Held], true);
    }

    public function canBeVoided(): bool
    {
        return in_array($this->status, [OrderStatus::Completed, OrderStatus::Held, OrderStatus::Draft], true);
    }
}
