<?php

namespace App\Domain\Menu\Factories;

use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'tenant_id' => Tenant::factory(),
            'category_id' => Category::factory(),
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####')),
            'price_dine_in' => fake()->randomFloat(2, 2, 30),
            'price_takeaway' => fake()->randomFloat(2, 2, 30),
            'price_delivery' => fake()->randomFloat(2, 3, 35),
            'inventory_mode' => InventoryMode::None,
            'is_active' => true,
            'is_available' => true,
            'sort_order' => 0,
        ];
    }

    public function tracksStockOwn(): static
    {
        return $this->state(fn () => ['inventory_mode' => InventoryMode::Product]);
    }
}
