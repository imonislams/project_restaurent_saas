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
use Illuminate\Support\Facades\DB;
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
        unset($data['image'], $data['remove_image']);

        $product = Product::create($data);

        $this->syncVariants($product, $request->validated('variants') ?? []);
        $this->storeProductImage($product, $request->file('image'));

        return back()->with('success', 'Product created.');
    }

    public function updateProduct(ProductRequest $request, Product $product): RedirectResponse
    {
        $data = $this->productAttributes($request->validated(), $product);
        unset($data['image'], $data['remove_image']);

        $product->update($data);

        $this->syncVariants($product, $request->validated('variants') ?? []);

        // An explicit removal wins over an upload; otherwise a file replaces the image and
        // sending neither leaves the existing image untouched.
        if ($request->boolean('remove_image')) {
            $this->deleteProductImage($product);
        } else {
            $this->storeProductImage($product, $request->file('image'));
        }

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

    /**
     * Store an uploaded image and replace the previous file, if any.
     *
     * The new file is written first, the row is updated inside a transaction, and the
     * previous file is only deleted once the new path is committed. If the row update
     * fails the freshly written file is removed, so the database and the storage disk
     * never drift apart.
     */
    protected function storeProductImage(Product $product, ?UploadedFile $file): void
    {
        if ($file === null) {
            return;
        }

        $previous = $product->image_path;
        $path = $file->store('products/'.$product->tenant_id, 'public');

        try {
            DB::transaction(fn () => $product->forceFill(['image_path' => $path])->save());
        } catch (\Throwable $e) {
            Storage::disk('public')->delete($path);

            throw $e;
        }

        if ($previous && $previous !== $path) {
            $this->deleteStoredImage($previous);
        }
    }

    /**
     * Clear the product's image reference, then delete the stored file. The row is
     * updated first so a failed file delete leaves a harmless orphan rather than a
     * product pointing at a file that no longer exists.
     */
    protected function deleteProductImage(Product $product): void
    {
        $path = $product->image_path;

        if ($path === null) {
            return;
        }

        DB::transaction(fn () => $product->forceFill(['image_path' => null])->save());

        $this->deleteStoredImage($path);
    }

    public function destroyProductImage(Product $product): RedirectResponse
    {
        $this->deleteProductImage($product);

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
     * Reconcile a product's variants against the submitted set.
     *
     * Existing variants are updated in place rather than deleted and recreated, so their
     * ids survive an edit. Order items reference `product_variants.id` with a
     * `nullOnDelete` key, so recreating them would silently blank the variant that past
     * sales recorded. Only variants the user actually removed are deleted.
     *
     * @param  list<array<string, mixed>>  $variants
     */
    protected function syncVariants(Product $product, array $variants): void
    {
        $keptIds = [];

        foreach (array_values($variants) as $index => $variant) {
            $attributes = [
                'name' => $variant['name'],
                'sku' => $variant['sku'] ?? null,
                'price' => $variant['price'] ?? null,
                'sort_order' => $index,
                'is_default' => $index === 0,
            ];

            $existing = isset($variant['id'])
                ? $product->variants()->whereKey($variant['id'])->first()
                : null;

            if ($existing) {
                $existing->update($attributes);
                $keptIds[] = $existing->getKey();
            } else {
                $keptIds[] = $product->variants()->create($attributes + [
                    'tenant_id' => $product->tenant_id,
                ])->getKey();
            }
        }

        $product->variants()->whereNotIn('id', $keptIds)->delete();
    }

    /**
     * Delete a stored product image unless another product record still points at the
     * same file. Paths are tenant-scoped, but an import or a duplicate can legitimately
     * share one file, and a soft-deleted product may still reference it.
     */
    protected function deleteStoredImage(?string $path): void
    {
        if ($path === null) {
            return;
        }

        $stillReferenced = Product::withoutGlobalScopes()
            ->where('image_path', $path)
            ->exists();

        if (! $stillReferenced) {
            Storage::disk('public')->delete($path);
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
