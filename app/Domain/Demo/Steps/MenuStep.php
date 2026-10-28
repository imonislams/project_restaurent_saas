<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Demo\Data\DemoProfile;
use App\Domain\Demo\DemoRun;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\ProductAvailability;
use App\Domain\Menu\Models\ProductVariant;
use App\Domain\Menu\Models\Recipe;
use App\Domain\Menu\Models\RecipeItem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * The menu: categories, products with real prices and margins, size variants,
 * modifier groups, recipes that deduct ingredients on every sale, and stock for
 * packaged items.
 *
 * Products are matched by name so re-running the step adopts what already
 * exists instead of creating a second copy.
 */
class MenuStep implements DemoStep
{
    /** Bottles and cans held per branch. */
    protected const PACKAGED_STOCK = 150;

    public function key(): string
    {
        return 'menu';
    }

    public function label(): string
    {
        return 'Menu, modifiers & recipes';
    }

    public function run(DemoRun $run): array
    {
        $profile = $run->profile();
        $tenantId = $run->batch->tenant_id;

        $stations = (array) $run->ref('stations.primary', []);
        $ingredients = (array) $run->ref('ingredients', []);
        $ingredientUnits = (array) $run->ref('ingredient_units', []);
        $catalogIngredients = $profile->ingredients();

        $modifiers = $this->modifierGroups($run, $profile);
        $publishedImages = $this->publishImages($profile);

        $productIds = [];
        $salesRefs = [];
        $categoryCount = 0;

        foreach ($profile->menu() as $categoryIndex => $categoryDefinition) {
            $category = Category::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $categoryDefinition['name']],
                [
                    'slug' => $run->uniqueSlug(Category::class, $categoryDefinition['name']),
                    'sort_order' => $categoryIndex,
                    'is_active' => true,
                ],
            );

            $categoryCount++;

            foreach ($categoryDefinition['items'] as $itemIndex => $item) {
                $product = Product::query()->withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('name', $item['name'])
                    ->first();

                if (! $product) {
                    $product = Product::create([
                        'tenant_id' => $tenantId,
                        'category_id' => $category->getKey(),
                        'kitchen_station_id' => $stations[$categoryDefinition['station']] ?? null,
                        'name' => $item['name'],
                        'slug' => $run->uniqueSlug(Product::class, $item['name']),
                        'description' => $item['description'],
                        'sku' => $this->sku($run, $categoryDefinition['name'], $itemIndex + 1),
                        'price_dine_in' => $item['price'],
                        'price_takeaway' => $item['price'],
                        'price_delivery' => round($item['price'] * 1.1, 2),
                        'cost_price' => $this->costPrice($item, $catalogIngredients),
                        'labels' => $item['labels'] ?? null,
                        'inventory_mode' => $this->inventoryMode($item),
                        'is_active' => true,
                        'is_available' => true,
                        'sort_order' => $itemIndex,
                    ]);
                }

                $productIds[] = $product->getKey();

                // Never overwrite an image the owner has uploaded.
                if ($product->image_path === null) {
                    $image = $this->imageFor($profile, $categoryDefinition['name'], $itemIndex, $publishedImages);

                    if ($image !== null) {
                        $product->forceFill(['image_path' => $image])->save();
                    }
                }

                $salesRefs[] = [
                    'id' => $product->getKey(),
                    'name' => $item['name'],
                    'kind' => $categoryDefinition['kind'],
                    'price' => (float) $product->price_dine_in,
                    'variants' => $this->variants($run, $product, $item),
                    'groups' => $item['modifiers'] ?? [],
                ];

                $this->attachModifiers($run, $product, $item, $modifiers);
                $this->recipe($run, $product, $item, $ingredients, $ingredientUnits);
                $this->packagedStock($run, $product, $item);
            }
        }

        $hiddenInAnnex = $this->branchOverrides($run, $productIds);

        if ($hiddenInAnnex !== null) {
            foreach ($salesRefs as $index => $ref) {
                if ($ref['id'] === $hiddenInAnnex) {
                    $salesRefs[$index]['unavailable'] = ['annex'];
                }
            }
        }

        $run->putRefs([
            'products' => $salesRefs,
            'modifiers' => $modifiers,
        ]);

        return [
            'categories' => $categoryCount,
            'products' => count($productIds),
            'images' => $productIds === []
                ? 0
                : Product::query()->withoutGlobalScopes()->whereIn('id', $productIds)->whereNotNull('image_path')->count(),
        ];
    }

    /**
     * Copy the bundled illustrations onto the public disk.
     *
     * Without the `public/storage` link they would 404, so the demo degrades to
     * the branded fallback tile instead of showing broken images.
     *
     * @return array<string, string> file name => storage path
     */
    protected function publishImages(DemoProfile $profile): array
    {
        if (! file_exists(public_path('storage'))) {
            return [];
        }

        $files = array_merge(...array_values($profile->images()));
        $published = [];

        foreach (array_unique($files) as $file) {
            $source = resource_path('demo/menu/'.$file);

            if (! is_file($source)) {
                continue;
            }

            $target = 'demo/menu/'.$file;

            if (! Storage::disk('public')->exists($target)) {
                Storage::disk('public')->put($target, (string) file_get_contents($source));
            }

            $published[$file] = $target;
        }

        return $published;
    }

    /**
     * @param  array<string, string>  $published
     */
    protected function imageFor(DemoProfile $profile, string $categoryName, int $index, array $published): ?string
    {
        $candidates = $profile->images()[$categoryName] ?? [];

        if ($candidates === [] || $published === []) {
            return null;
        }

        return $published[$candidates[$index % count($candidates)]] ?? null;
    }

    /**
     * @return array<string, array{id: int, options: list<int>, default: ?int, type: string}>
     */
    protected function modifierGroups(DemoRun $run, DemoProfile $profile): array
    {
        $tenantId = $run->batch->tenant_id;
        $result = [];
        $sort = 0;

        foreach ($profile->modifiers() as $key => $definition) {
            $group = ModifierGroup::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $definition['name']],
                [
                    'selection_type' => $definition['type'],
                    'min_select' => ! empty($definition['required']) ? 1 : 0,
                    'max_select' => $definition['type'] === 'single' ? 1 : ($definition['max'] ?? 5),
                    'is_required' => (bool) ($definition['required'] ?? false),
                    'sort_order' => $sort++,
                    'is_active' => true,
                ],
            );

            $options = [];
            $default = null;

            foreach ($definition['options'] as $index => $option) {
                $model = ModifierOption::query()->withoutGlobalScopes()->firstOrCreate(
                    ['modifier_group_id' => $group->getKey(), 'name' => $option['name']],
                    [
                        'tenant_id' => $tenantId,
                        'price_delta' => $option['price'],
                        'is_default' => (bool) ($option['default'] ?? false),
                        'is_active' => true,
                        'sort_order' => $index,
                    ],
                );

                $options[] = $model->getKey();

                if (! empty($option['default'])) {
                    $default = $model->getKey();
                }
            }

            $result[$key] = [
                'id' => $group->getKey(),
                'options' => $options,
                'default' => $default,
                'type' => $definition['type'],
            ];
        }

        return $result;
    }

    /**
     * @return list<array{id: int, name: string, price: float}>
     */
    protected function variants(DemoRun $run, Product $product, array $item): array
    {
        if (empty($item['variants'])) {
            return [];
        }

        $tenantId = $run->batch->tenant_id;
        $result = [];

        foreach ($item['variants'] as $index => $variant) {
            $model = ProductVariant::query()->withoutGlobalScopes()->firstOrCreate(
                ['product_id' => $product->getKey(), 'name' => $variant['name']],
                [
                    'tenant_id' => $tenantId,
                    'price' => $variant['price'],
                    'is_default' => (bool) ($variant['default'] ?? false),
                    'sort_order' => $index,
                ],
            );

            $result[] = [
                'id' => $model->getKey(),
                'name' => $variant['name'],
                'price' => (float) $model->price,
            ];
        }

        return $result;
    }

    protected function attachModifiers(DemoRun $run, Product $product, array $item, array $modifiers): void
    {
        $tenantId = $run->batch->tenant_id;

        foreach (($item['modifiers'] ?? []) as $index => $groupKey) {
            if (! isset($modifiers[$groupKey])) {
                continue;
            }

            $groupId = $modifiers[$groupKey]['id'];

            if ($product->modifierGroups()->where('modifier_group_id', $groupId)->exists()) {
                continue;
            }

            $product->modifierGroups()->attach($groupId, [
                'tenant_id' => $tenantId,
                'sort_order' => $index,
            ]);
        }
    }

    /**
     * A recipe makes the product deduct real ingredients on every sale.
     */
    protected function recipe(DemoRun $run, Product $product, array $item, array $ingredients, array $units): void
    {
        if (empty($item['recipe'])) {
            return;
        }

        $tenantId = $run->batch->tenant_id;

        $recipe = Recipe::query()->withoutGlobalScopes()->firstOrCreate(
            ['product_id' => $product->getKey(), 'version' => 1],
            [
                'tenant_id' => $tenantId,
                'name' => $item['name'].' — standard recipe',
                'yield_quantity' => 1,
                'is_active' => true,
            ],
        );

        foreach ($item['recipe'] as $ingredientKey => $quantity) {
            if (! isset($ingredients[$ingredientKey])) {
                continue;
            }

            RecipeItem::query()->withoutGlobalScopes()->firstOrCreate(
                ['recipe_id' => $recipe->getKey(), 'ingredient_id' => $ingredients[$ingredientKey]],
                [
                    'tenant_id' => $tenantId,
                    'unit_id' => $units[$ingredientKey] ?? null,
                    'quantity' => $quantity,
                ],
            );
        }

        if ($product->inventory_mode !== InventoryMode::Recipe) {
            $product->forceFill(['inventory_mode' => InventoryMode::Recipe])->save();
        }
    }

    /**
     * Packaged items hold their own stock — at every branch, since both sell
     * them (a single-branch stock would go negative at the other).
     */
    protected function packagedStock(DemoRun $run, Product $product, array $item): void
    {
        if (empty($item['stock']) || $run->hasOpeningStock($product)) {
            return;
        }

        $stock = app(StockService::class);

        foreach (['primary' => self::PACKAGED_STOCK, 'annex' => (int) (self::PACKAGED_STOCK * 0.4)] as $branchKey => $quantity) {
            $stock->receiveOpening(
                $product,
                $run->location($run->branch($branchKey)),
                (float) $quantity,
                (float) $product->cost_price,
            );
        }
    }

    /**
     * One item is deliberately unavailable at the second branch, so the
     * per-branch availability override is visible in the POS. Returns the item,
     * which the order generator must skip at that branch (the POS rejects an
     * unavailable item, and so must the demo).
     *
     * @param  list<int>  $productIds
     */
    protected function branchOverrides(DemoRun $run, array $productIds): ?int
    {
        if ($productIds === []) {
            return null;
        }

        $hidden = (int) end($productIds);
        $annex = $run->branch('annex');

        ProductAvailability::query()->withoutGlobalScopes()->updateOrCreate(
            ['product_id' => $hidden, 'branch_id' => $annex->getKey()],
            ['tenant_id' => $run->batch->tenant_id, 'is_available' => false],
        );

        return $hidden;
    }

    protected function inventoryMode(array $item): InventoryMode
    {
        if (! empty($item['recipe'])) {
            return InventoryMode::Recipe;
        }

        return ! empty($item['stock']) ? InventoryMode::Product : InventoryMode::None;
    }

    /**
     * Cost price from the recipe where there is one, otherwise a realistic
     * food-cost ratio, so margin reports are not nonsense.
     *
     * @param  array<string, array{name: string, unit: string, cost: float}>  $catalogIngredients
     */
    protected function costPrice(array $item, array $catalogIngredients): float
    {
        if (! empty($item['recipe'])) {
            $total = 0.0;

            foreach ($item['recipe'] as $key => $quantity) {
                if (isset($catalogIngredients[$key])) {
                    $total += (float) $quantity * (float) $catalogIngredients[$key]['cost'];
                }
            }

            if ($total > 0) {
                return round($total, 4);
            }
        }

        if (! empty($item['cost_key']) && isset($catalogIngredients[$item['cost_key']])) {
            return round((float) $catalogIngredients[$item['cost_key']]['cost'], 4);
        }

        return round((float) $item['price'] * 0.38, 4);
    }

    /** Readable, unique-per-tenant SKU, e.g. "KB-01" for Kacchi & Biryani. */
    protected function sku(DemoRun $run, string $categoryName, int $index): string
    {
        $initials = collect(preg_split('/\s+/', $categoryName) ?: [])
            ->map(fn (string $word) => Str::substr(preg_replace('/[^A-Za-z]/', '', $word) ?? '', 0, 1))
            ->implode('');

        $code = Str::upper(Str::substr($initials, 0, 3)) ?: 'ITM';

        return $run->uniqueSku(Product::class, sprintf('%s-%02d', $code, $index));
    }
}
