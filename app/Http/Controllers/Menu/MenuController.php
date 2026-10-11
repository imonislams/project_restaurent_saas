<?php

namespace App\Http\Controllers\Menu;

use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\CategoryRequest;
use App\Http\Requests\Menu\ProductRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MenuController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $categoryId = $request->integer('category_id') ?: null;

        $categories = Category::query()
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => [
                'id' => $category->getKey(),
                'name' => $category->name,
                'parent_id' => $category->parent_id,
                'sort_order' => $category->sort_order,
                'is_active' => $category->is_active,
                'products_count' => $category->products_count,
            ]);

        $products = Product::query()
            ->with(['category:id,name', 'variants'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Product $product) => [
                'id' => $product->getKey(),
                'name' => $product->name,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name,
                'tax_category' => $product->tax_category,
                'price_dine_in' => (float) $product->price_dine_in,
                'price_takeaway' => (float) $product->price_takeaway,
                'price_delivery' => (float) $product->price_delivery,
                'cost_price' => (float) $product->cost_price,
                'inventory_mode' => $product->inventory_mode->value,
                'is_active' => $product->is_active,
                'is_available' => $product->is_available,
                'labels' => $product->labels ?? [],
                'sort_order' => $product->sort_order,
                'variants' => $product->variants->map(fn ($variant) => [
                    'id' => $variant->getKey(),
                    'name' => $variant->name,
                    'sku' => $variant->sku,
                    'price' => $variant->price !== null ? (float) $variant->price : null,
                ]),
            ]);

        return Inertia::render('Menu/Index', [
            'categories' => $categories,
            'products' => $products,
            'filters' => ['search' => $search, 'category_id' => $categoryId],
            'inventoryModes' => collect(InventoryMode::cases())
                ->map(fn (InventoryMode $mode) => ['value' => $mode->value, 'label' => $mode->label()])
                ->values(),
        ]);
    }

    public function storeCategory(CategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] = $this->uniqueCategorySlug($data['name']);

        Category::create($data);

        return back()->with('success', 'Category created.');
    }

    public function updateCategory(CategoryRequest $request, Category $category): RedirectResponse
    {
        $data = $request->validated();
        $data['slug'] = $this->uniqueCategorySlug($data['name'], $category->getKey());

        $category->update($data);

        return back()->with('success', 'Category updated.');
    }

    public function destroyCategory(Category $category): RedirectResponse
    {
        $category->delete();

        return back()->with('success', 'Category removed.');
    }

    public function storeProduct(ProductRequest $request): RedirectResponse
    {
        $data = $this->productAttributes($request->validated());

        $product = Product::create($data);

        $this->syncVariants($product, $request->validated('variants') ?? []);

        return back()->with('success', 'Product created.');
    }

    public function updateProduct(ProductRequest $request, Product $product): RedirectResponse
    {
        $product->update($this->productAttributes($request->validated(), $product));

        $this->syncVariants($product, $request->validated('variants') ?? []);

        return back()->with('success', 'Product updated.');
    }

    public function destroyProduct(Product $product): RedirectResponse
    {
        $product->delete();

        return back()->with('success', 'Product removed.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function productAttributes(array $data, ?Product $product = null): array
    {
        $data['slug'] = $this->uniqueProductSlug($data['name'], $product?->getKey());
        $data['labels'] = $data['labels'] ?? [];
        $data['cost_price'] = $data['cost_price'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;
        $data['is_available'] = $data['is_available'] ?? true;
        $data['sort_order'] = $data['sort_order'] ?? 0;

        return $data;
    }

    /**
     * @param  list<array<string, mixed>>  $variants
     */
    protected function syncVariants(Product $product, array $variants): void
    {
        $product->variants()->delete();

        foreach (array_values($variants) as $index => $variant) {
            $product->variants()->create([
                'tenant_id' => $product->tenant_id,
                'name' => $variant['name'],
                'sku' => $variant['sku'] ?? null,
                'price' => $variant['price'] ?? null,
                'sort_order' => $index,
                'is_default' => $index === 0,
            ]);
        }
    }

    protected function uniqueCategorySlug(string $name, ?int $ignoreId = null): string
    {
        return $this->uniqueSlug(Category::class, $name, $ignoreId);
    }

    protected function uniqueProductSlug(string $name, ?int $ignoreId = null): string
    {
        return $this->uniqueSlug(Product::class, $name, $ignoreId);
    }

    /**
     * @param  class-string<Model>  $model
     */
    protected function uniqueSlug(string $model, string $name, ?int $ignoreId): string
    {
        $base = Str::slug($name) ?: 'item';
        $slug = $base;
        $suffix = 1;

        while ($model::withTrashed()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.(++$suffix);
        }

        return $slug;
    }
}
