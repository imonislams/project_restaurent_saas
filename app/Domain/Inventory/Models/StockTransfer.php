<?php

namespace App\Domain\Inventory\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Support\BranchScope;
use App\Domain\Inventory\Enums\TransferStatus;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockTransfer extends Model
{
    use BelongsToTenant, SoftDeletes;

    /**
     * A transfer is accessible when the user can reach either of its branches.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('branch', function ($builder): void {
            $ids = BranchScope::accessibleBranchIds();

            if ($ids === null) {
                return;
            }

            if ($ids === []) {
                $builder->whereRaw('1 = 0');

                return;
            }

            $table = $builder->getModel()->getTable();

            $builder->where(function ($query) use ($table, $ids): void {
                $query->whereIn($table.'.from_branch_id', $ids)
                    ->orWhereIn($table.'.to_branch_id', $ids);
            });
        });
    }

    protected $fillable = [
        'tenant_id',
        'from_branch_id',
        'to_branch_id',
        'number',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'dispatched_by',
        'received_by',
        'dispatched_at',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => TransferStatus::class,
            'dispatched_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function fromBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockTransferItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
