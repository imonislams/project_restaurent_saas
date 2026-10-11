<?php

namespace App\Domain\Inventory\Factories;

use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\Unit;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ingredient>
 */
class IngredientFactory extends Factory
{
    protected $model = Ingredient::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'unit_id' => Unit::factory(),
            'name' => fake()->unique()->word(),
            'cost_per_unit' => fake()->randomFloat(2, 1, 100),
            'track_inventory' => true,
            'is_active' => true,
        ];
    }
}
