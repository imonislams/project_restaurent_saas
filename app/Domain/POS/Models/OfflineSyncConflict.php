<?php

namespace App\Domain\POS\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One operation replayed from an offline device that needs review.
 */
class OfflineSyncConflict extends Model
{
    public const TYPE_TOTAL_MISMATCH = 'total_mismatch';

    public const TYPE_STOCK_INSUFFICIENT = 'stock_insufficient';

    public const TYPE_SHIFT_CLOSED = 'shift_closed';

    public const TYPE_TABLE_OCCUPIED = 'table_occupied';

    public const TYPE_PRODUCT_UNAVAILABLE = 'product_unavailable';

    public const TYPE_REJECTED = 'rejected';

    public const STATUS_OPEN = 'open';

    public const STATUS_RESOLVED = 'resolved';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'offline_uuid',
        'operation_type',
        'order_id',
        'order_reference',
        'type',
        'status',
        'message',
        'expected',
        'actual',
        'payload',
        'resolved_by',
        'resolved_at',
        'resolution_note',
    ];

    protected function casts(): array
    {
        return [
            'expected' => 'array',
            'actual' => 'array',
            'payload' => 'array',
            'resolved_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }
}
