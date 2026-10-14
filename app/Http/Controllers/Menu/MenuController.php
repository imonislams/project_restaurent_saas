<?php

namespace App\Http\Controllers\Menu;

use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\ProductImportService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Menu\CategoryRequest;
use App\Http\Requests\Menu\ProductRequest;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
                'image_url' => $product->image_url,
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
        unset($data['image']);

        $product = Product::create($data);

        $this->syncVariants($product, $request->validated('variants') ?? []);
        $this->storeProductImage($product, $request->file('image'));

        return back()->with('success', 'Product created.');
    }

    public function updateProduct(ProductRequest $request, Product $product): RedirectResponse
    {
        $data = $this->productAttributes($request->validated(), $product);
        unset($data['image']);

        $product->update($data);

        $this->syncVariants($product, $request->validated('variants') ?? []);
        $this->storeProductImage($product, $request->file('image'));

        return back()->with('success', 'Product updated.');
    }

    public function destroyProduct(Product $product): RedirectResponse
    {
        $product->delete();

        return back()->with('success', 'Product removed.');
    }

    public function updateProductImage(Request $request, Product $product): RedirectResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $this->storeProductImage($product, $request->file('image'));

        return back()->with('success', 'Product image updated.');
    }

    /** Store an uploaded image and replace the previous file, if any. */
    protected function storeProductImage(Product $product, ?UploadedFile $file): void
    {
        if ($file === null) {
            return;
        }

        $previous = $product->image_path;
        $path = $file->store('products/'.$product->tenant_id, 'public');

        $product->forceFill(['image_path' => $path])->save();

        if ($previous && $previous !== $path) {
            Storage::disk('public')->delete($previous);
        }
    }

    public function destroyProductImage(Product $product): RedirectResponse
    {
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
            $product->forceFill(['image_path' => null])->save();
        }

        return back()->with('success', 'Product image removed.');
    }

    /** Downloadable CSV template for bulk product import. */
    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ProductImportService::COLUMNS);
            fputcsv($out, ['Chicken Biryani', 'Mains', 'BRY-01', '', 320, 320, 340, 120, 'Signature dish', '1', '']);
            fclose($out);
        }, 'product-import-template.csv', ['Content-Type' => 'text/csv']);
    }

    /** Export the product catalogue as CSV or PDF. */
    public function export(Request $request): StreamedResponse|\Illuminate\Http\Response
    {
        $products = Product::query()->with('category:id,name')->orderBy('name')->get();

        if ($request->string('format')->toString() === 'pdf') {
            return Pdf::loadView('products.export', [
                'products' => $products,
                'tenant' => $request->user()->tenant,
                'generatedAt' => now(),
            ])->download('products-'.now()->format('Ymd').'.pdf');
        }

        return response()->streamDownload(function () use ($products) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ProductImportService::COLUMNS);
            foreach ($products as $product) {
                fputcsv($out, [
                    $product->name,
                    $product->category?->name,
                    $product->sku,
                    $product->barcode,
                    (float) $product->price_dine_in,
                    (float) $product->price_takeaway,
                    (float) $product->price_delivery,
                    (float) $product->cost_price,
                    $product->description,
                    $product->is_active ? '1' : '0',
                    $product->image_url,
                ]);
            }
            fclose($out);
        }, 'products-'.now()->format('Ymd').'.csv', ['Content-Type' => 'text/csv']);
    }

    /** Bulk import products from a CSV upload. */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $result = app(ProductImportService::class)->import($request->user()->tenant, $request->file('file'));

        $message = "Imported {$result['created']} new, {$result['updated']} updated.";

        if ($result['errors'] !== []) {
            $message .= ' '.$result['skipped'].' row(s) skipped.';
        }

        if (($result['warnings'] ?? []) !== []) {
            $message .= ' '.count($result['warnings']).' image(s) skipped.';
        }

        return back()->with('success', $message)->with('import_result', [
            'created' => $result['created'],
            'updated' => $result['updated'],
            'skipped' => $result['skipped'],
            'errors' => $result['errors'],
            'warnings' => $result['warnings'] ?? [],
        ]);
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
