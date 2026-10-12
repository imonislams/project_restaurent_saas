<?php

namespace App\Domain\Menu\Factories;

use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModifierOption>
 */
class ModifierOptionFactory extends Factory
{
    protected $model = ModifierOption::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'modifier_group_id' => ModifierGroup::factory(),
            'name' => fake()->words(2, true),
            'sku' => null,
            'price_delta' => fake()->randomFloat(2, 0, 5),
            'is_default' => false,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
