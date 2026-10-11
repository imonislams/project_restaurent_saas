<?php

namespace App\Domain\Menu\Models;

use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Recipe extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'product_id',
        'name',
        'yield_quantity',
        'version',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'yield_quantity' => 'decimal:3',
            'version' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RecipeItem::class);
    }

    /**
     * Ingredient cost of one yield unit, using current ingredient costs.
     */
    public function costPerYield(): float
    {
        $total = $this->items->sum(
            fn (RecipeItem $item) => (float) $item->quantity * (float) ($item->ingredient?->cost_per_unit ?? 0)
        );

        $yield = (float) $this->yield_quantity ?: 1.0;

        return round($total / $yield, 4);
    }
}
