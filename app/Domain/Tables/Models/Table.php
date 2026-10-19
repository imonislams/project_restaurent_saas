<?php

namespace App\Domain\Tables\Models;

use App\Domain\Dining\Models\DiningSession;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tables\Factories\TableFactory;
use App\Domain\Branches\Concerns\BelongsToBranch;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Table extends Model
{
    use BelongsToTenant, BelongsToBranch, HasFactory, SoftDeletes;

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

    protected static function newFactory(): TableFactory
    {
        return TableFactory::new();
    }

    public function diningArea(): BelongsTo
    {
        return $this->belongsTo(DiningArea::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function qrTokens(): HasMany
    {
        return $this->hasMany(TableQrToken::class);
    }

    public function diningSessions(): HasMany
    {
        return $this->hasMany(DiningSession::class);
    }

    public function hasOpenOrders(): bool
    {
        return $this->orders()->whereNotIn('status', ['completed', 'voided'])->exists();
    }
}
