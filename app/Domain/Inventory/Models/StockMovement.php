<?php

namespace App\Domain\Inventory\Models;

use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Append-only stock movement. Balances are derived from these records; a
 * movement is never updated or deleted.
 */
class StockMovement extends Model
{
    use BelongsToTenant;

    /** Append-only: never update a record. */
    public const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'stock_location_id',
        'stockable_type',
        'stockable_id',
        'quantity_delta',
        'unit_cost',
        'reason',
        'source_type',
        'source_id',
        'note',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity_delta' => 'decimal:3',
            'unit_cost' => 'decimal:4',
            'reason' => StockMovementReason::class,
            'created_at' => 'datetime',
        ];
    }

    public function stockLocation(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    public function stockable(): MorphTo
    {
        return $this->morphTo();
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
