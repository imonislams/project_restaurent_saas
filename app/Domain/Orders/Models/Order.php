<?php

namespace App\Domain\Orders\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Register;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Payments\Models\Payment;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'shift_id',
        'register_id',
        'table_id',
        'delivery_zone_id',
        'customer_id',
        'user_id',
        'order_number',
        'order_type',
        'status',
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
        'voided_at',
    ];

    protected function casts(): array
    {
        return [
            'order_type' => OrderType::class,
            'status' => OrderStatus::class,
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
