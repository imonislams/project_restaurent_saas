<?php

namespace App\Domain\Tables\Factories;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Table>
 */
class TableFactory extends Factory
{
    protected $model = Table::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'branch_id' => Branch::factory(),
            'dining_area_id' => null,
            'name' => 'Table '.fake()->unique()->numberBetween(1, 500),
            'seats' => fake()->numberBetween(2, 8),
            'status' => TableStatus::Available,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
