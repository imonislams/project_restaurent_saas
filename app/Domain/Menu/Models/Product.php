<?php

namespace App\Domain\Menu\Models;

use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Kitchen\Models\KitchenStation;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Factories\ProductFactory;
use App\Domain\Tenancy\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'kitchen_station_id',
        'name',
        'slug',
        'description',
        'sku',
        'barcode',
        'tax_category',
        'price_dine_in',
        'price_takeaway',
        'price_delivery',
        'cost_price',
        'image_path',
        'labels',
        'inventory_mode',
        'is_active',
        'is_available',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_dine_in' => 'decimal:2',
            'price_takeaway' => 'decimal:2',
            'price_delivery' => 'decimal:2',
            'cost_price' => 'decimal:4',
            'labels' => 'array',
            'inventory_mode' => InventoryMode::class,
            'is_active' => 'boolean',
            'is_available' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function newFactory(): ProductFactory
    {
        return ProductFactory::new();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function kitchenStation(): BelongsTo
    {
        return $this->belongsTo(KitchenStation::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order');
    }

    public function modifierGroups(): BelongsToMany
    {
        return $this->belongsToMany(ModifierGroup::class, 'modifier_group_product')
            ->using(ModifierGroupProduct::class)
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    public function availability(): HasMany
    {
        return $this->hasMany(ProductAvailability::class);
    }

    public function recipe(): HasMany
    {
        return $this->hasMany(Recipe::class);
    }

    public function stockBalances(): MorphMany
    {
        return $this->morphMany(StockBalance::class, 'stockable');
    }

    public function stockMovements(): MorphMany
    {
        return $this->morphMany(StockMovement::class, 'stockable');
    }

    public function isAvailableIn(int $branchId): bool
    {
        if (! $this->is_available || ! $this->is_active) {
            return false;
        }

        $override = $this->availability->firstWhere('branch_id', $branchId);

        return $override?->is_available ?? true;
    }
}
