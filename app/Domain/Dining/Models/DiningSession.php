<?php

namespace App\Domain\Dining\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Dining\Enums\BillingMode;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Dining\Factories\DiningSessionFactory;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DiningSession extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'table_id',
        'customer_id',
        'session_token',
        'status',
        'billing_mode',
        'guest_label',
        'started_at',
        'last_activity_at',
        'expires_at',
        'closed_at',
        'closed_by',
        'close_reason',
        'settled_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'status' => DiningSessionStatus::class,
            'billing_mode' => BillingMode::class,
            'started_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'expires_at' => 'datetime',
            'closed_at' => 'datetime',
            'settled_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    protected static function newFactory(): DiningSessionFactory
    {
        return DiningSessionFactory::new();
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(DiningParticipant::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'dining_session_id');
    }

    public function billRequests(): HasMany
    {
        return $this->hasMany(BillRequest::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(DiningEvent::class);
    }

    public function feedback(): HasOne
    {
        return $this->hasOne(DiningFeedback::class);
    }

    public function isActive(): bool
    {
        return $this->status->isActive();
    }

    public function isClosed(): bool
    {
        return $this->status->isClosed();
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /** Outstanding balance across the session's live (non-voided) orders. */
    public function outstandingTotal(): float
    {
        return (float) $this->orders()
            ->whereNotIn('status', ['voided'])
            ->sum('total');
    }
}
