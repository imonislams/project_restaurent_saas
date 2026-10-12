<?php

namespace App\Domain\Menu;

use App\Domain\Branches\Models\Branch;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\Storage;

/**
 * Builds the customer-facing (public) menu for a branch: only active and
 * branch-available products, with variants, modifier groups and dietary labels.
 */
class QrMenuService
{
    /**
     * @return array<string, mixed>
     */
    public function forBranch(Tenant $tenant, Branch $branch): array
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('name')
            ->get(['id', 'name', 'parent_id'])
            ->map(fn (Category $category) => [
                'id' => $category->getKey(),
                'name' => $category->name,
                'parent_id' => $category->parent_id,
            ]);

        $products = Product::query()
            ->where('is_active', true)
            ->with(['category:id,name', 'variants', 'modifierGroups.options'])
            ->orderBy('sort_order')->orderBy('name')
            ->get()
            ->filter(fn (Product $product) => $product->isAvailableIn($branch->getKey()))
            ->map(fn (Product $product) => [
                'id' => $product->getKey(),
                'name' => $product->name,
                'description' => $product->description,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name,
                'price' => (float) $product->price_dine_in,
                'image_url' => $product->image_path ? Storage::disk('public')->url($product->image_path) : null,
                'labels' => $product->labels ?? [],
                'variants' => $product->variants->map(fn ($variant) => [
                    'id' => $variant->getKey(),
                    'name' => $variant->name,
                    'price' => $variant->price !== null ? (float) $variant->price : (float) $product->price_dine_in,
                ])->values(),
                'modifier_groups' => $product->modifierGroups
                    ->where('is_active', true)
                    ->map(fn ($group) => [
                        'id' => $group->getKey(),
                        'name' => $group->name,
                        'selection_type' => $group->selection_type->value,
                        'min_select' => $group->effectiveMin(),
                        'max_select' => $group->effectiveMax(),
                        'is_required' => $group->is_required,
                        'options' => $group->options
                            ->where('is_active', true)
                            ->map(fn ($option) => [
                                'id' => $option->getKey(),
                                'name' => $option->name,
                                'price_delta' => (float) $option->price_delta,
                            ])->values(),
                    ])->values(),
            ])->values();

        return [
            'restaurant' => [
                'name' => $tenant->name,
                'branch' => $branch->name,
                'currency' => $branch->effectiveCurrency(),
                'logo_url' => $tenant->logo_url,
            ],
            'categories' => $categories,
            'products' => $products,
        ];
    }
}
