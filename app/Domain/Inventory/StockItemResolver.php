<?php

namespace App\Domain\Inventory;

use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Resolves a stockable item (product or ingredient) from its morph alias,
 * always scoped to the current tenant.
 */
class StockItemResolver
{
    public const TYPES = ['product', 'ingredient'];

    public static function resolve(string $type, int $id): Model
    {
        return match ($type) {
            'product' => Product::query()->findOrFail($id),
            'ingredient' => Ingredient::query()->findOrFail($id),
            default => throw ValidationException::withMessages([
                'item_type' => "Unknown item type \"{$type}\".",
            ]),
        };
    }

    public static function unitCost(Model $item): float
    {
        return match (true) {
            $item instanceof Ingredient => (float) $item->cost_per_unit,
            $item instanceof Product => (float) $item->cost_price,
            default => 0.0,
        };
    }
}
