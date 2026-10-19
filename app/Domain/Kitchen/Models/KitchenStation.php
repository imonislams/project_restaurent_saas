<?php

namespace App\Domain\Kitchen\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KitchenStation extends Model
{
    use BelongsToTenant, BelongsToBranch;

    protected $fillable = ['tenant_id', 'branch_id', 'name', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function ticketItems(): HasMany
    {
        return $this->hasMany(KitchenTicketItem::class, 'station_id');
    }
}
