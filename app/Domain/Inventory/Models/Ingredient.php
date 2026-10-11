<?php

namespace App\Domain\Inventory\Models;

use App\Domain\Inventory\Factories\IngredientFactory;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ingredient extends Model
{
    /** @use HasFactory<IngredientFactory> */
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'unit_id',
        'name',
        'cost_per_unit',
        'track_inventory',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost_per_unit' => 'decimal:4',
            'track_inventory' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    protected static function newFactory(): IngredientFactory
    {
        return IngredientFactory::new();
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function stockBalances(): MorphMany
    {
        return $this->morphMany(StockBalance::class, 'stockable');
    }

    public function stockMovements(): MorphMany
    {
        return $this->morphMany(StockMovement::class, 'stockable');
    }
}
