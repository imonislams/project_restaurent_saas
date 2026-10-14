<?php

namespace App\Domain\Menu;

use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Imports products from a CSV file. Rows are upserted by SKU (falling back to
 * name), so re-importing an edited file updates rather than duplicates. Invalid
 * rows are skipped and reported; the rest are committed in one transaction.
 */
class ProductImportService
{
    public const COLUMNS = [
        'name', 'category', 'sku', 'barcode', 'price_dine_in', 'price_takeaway',
        'price_delivery', 'cost_price', 'description', 'is_active', 'image_url',
    ];

    /**
     * @return array{created: int, updated: int, skipped: int, errors: list<string>, warnings: list<string>}
     */
    public function import(Tenant $tenant, UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            return ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => ['The file could not be read.'], 'warnings' => []];
        }

        $header = fgetcsv($handle);
        $header = is_array($header) ? array_map(fn ($h) => strtolower(trim((string) $h)), $header) : [];

        $created = 0;
        $updated = 0;
        $errors = [];
        $warnings = [];
        $rowNumber = 1;

        DB::transaction(function () use ($handle, $header, $tenant, &$created, &$updated, &$errors, &$warnings, &$rowNumber) {
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;

                if (count(array_filter($row, fn ($v) => $v !== null && $v !== '')) === 0) {
                    continue;
                }

                $record = array_combine($header, array_pad($row, count($header), null));
                $record = is_array($record) ? $record : [];

                $name = trim((string) ($record['name'] ?? ''));

                if ($name === '') {
                    $errors[] = "Row {$rowNumber}: missing product name.";

                    continue;
                }

                $sku = trim((string) ($record['sku'] ?? '')) ?: null;
                $categoryName = trim((string) ($record['category'] ?? ''));

                $existing = Product::withoutGlobalScopes()
                    ->where('tenant_id', $tenant->getKey())
                    ->when($sku !== null, fn ($q) => $q->where('sku', $sku), fn ($q) => $q->where('name', $name))
                    ->first();

                $attributes = [
                    'category_id' => $categoryName !== '' ? $this->category($tenant, $categoryName)->getKey() : null,
                    'name' => $name,
                    'sku' => $sku,
                    'barcode' => trim((string) ($record['barcode'] ?? '')) ?: null,
                    'description' => trim((string) ($record['description'] ?? '')) ?: null,
                    'price_dine_in' => (float) ($record['price_dine_in'] ?? 0),
                    'price_takeaway' => (float) ($record['price_takeaway'] ?? $record['price_dine_in'] ?? 0),
                    'price_delivery' => (float) ($record['price_delivery'] ?? $record['price_dine_in'] ?? 0),
                    'cost_price' => (float) ($record['cost_price'] ?? 0),
                    'is_active' => $this->truthy($record['is_active'] ?? '1'),
                ];

                // Optional image: download and store under the tenant's folder. A
                // failed download never drops the product — it is imported without
                // an image and the issue is reported as a warning.
                $imageUrl = trim((string) ($record['image_url'] ?? ''));

                if ($imageUrl !== '') {
                    $imagePath = $this->fetchImage($tenant, $imageUrl);

                    if ($imagePath !== null) {
                        $attributes['image_path'] = $imagePath;
                    } else {
                        $warnings[] = "Row {$rowNumber}: image could not be imported from {$imageUrl}.";
                    }
                }

                if ($existing) {
                    $existing->update($attributes);
                    $updated++;
                } else {
                    Product::create([
                        'tenant_id' => $tenant->getKey(),
                        'slug' => $this->slug($tenant, $name),
                        ...$attributes,
                    ]);
                    $created++;
                }
            }
        });

        fclose($handle);

        return ['created' => $created, 'updated' => $updated, 'skipped' => count($errors), 'errors' => $errors, 'warnings' => $warnings];
    }

    /**
     * Download a remote image and store it on the public disk. Returns the stored
     * path, or null when the URL is unreachable or not an allowed image type.
     */
    protected function fetchImage(Tenant $tenant, string $url): ?string
    {
        try {
            $response = Http::timeout(15)->get($url);

            if (! $response->successful()) {
                return null;
            }

            $body = $response->body();

            if ($body === '' || strlen($body) > 3 * 1024 * 1024) {
                return null;
            }

            $mime = strtolower((string) $response->header('Content-Type'));
            $extension = match (true) {
                str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => 'jpg',
                str_contains($mime, 'png') => 'png',
                str_contains($mime, 'webp') => 'webp',
                default => null,
            };

            if ($extension === null) {
                return null;
            }

            $path = 'products/'.$tenant->getKey().'/'.Str::random(24).'.'.$extension;
            Storage::disk('public')->put($path, $body);

            return $path;
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function category(Tenant $tenant, string $name): Category
    {
        return Category::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->getKey(), 'slug' => Str::slug($name) ?: 'category'],
            ['name' => $name, 'is_active' => true],
        );
    }

    protected function slug(Tenant $tenant, string $name): string
    {
        $base = Str::slug($name) ?: 'product';
        $slug = $base;
        $suffix = 1;

        while (Product::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->where('slug', $slug)->exists()) {
            $slug = $base.'-'.(++$suffix);
        }

        return $slug;
    }

    protected function truthy(mixed $value): bool
    {
        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'y', 'active'], true);
    }
}
