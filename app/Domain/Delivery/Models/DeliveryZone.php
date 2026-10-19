<?php

namespace App\Domain\Delivery\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryZone extends Model
{
    use BelongsToTenant, BelongsToBranch, SoftDeletes;

    protected static function branchScopeAllowsNull(): bool
    {
        return true;
    }

    protected $fillable = ['tenant_id', 'branch_id', 'name', 'fee', 'min_order', 'is_active'];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'min_order' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
