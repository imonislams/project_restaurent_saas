<?php

namespace App\Domain\Tables\Models;

use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Table extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'dining_area_id',
        'name',
        'seats',
        'status',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'status' => TableStatus::class,
            'seats' => 'integer',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function diningArea(): BelongsTo
    {
        return $this->belongsTo(DiningArea::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function hasOpenOrders(): bool
    {
        return $this->orders()->whereNotIn('status', ['completed', 'voided'])->exists();
    }
}
