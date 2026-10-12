<?php

namespace App\Domain\Menu\Factories;

use App\Domain\Menu\Enums\ModifierSelectionType;
use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModifierGroup>
 */
class ModifierGroupFactory extends Factory
{
    protected $model = ModifierGroup::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(2, true),
            'selection_type' => ModifierSelectionType::Single,
            'min_select' => 0,
            'max_select' => 1,
            'is_required' => false,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }

    public function multiple(int $max = 5): static
    {
        return $this->state(fn () => [
            'selection_type' => ModifierSelectionType::Multiple,
            'max_select' => $max,
        ]);
    }

    public function required(): static
    {
        return $this->state(fn () => [
            'is_required' => true,
            'min_select' => 1,
        ]);
    }
}
