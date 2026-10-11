<?php

namespace App\Domain\Menu\Models;

use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\Unit;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecipeItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'recipe_id',
        'ingredient_id',
        'unit_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:3'];
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
