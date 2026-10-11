<?php

namespace App\Domain\Inventory\Factories;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StockLocation>
 */
class StockLocationFactory extends Factory
{
    protected $model = StockLocation::class;

    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'tenant_id' => fn (array $attributes) => Branch::find($attributes['branch_id'])?->tenant_id
                ?? Tenant::factory()->create()->getKey(),
            'name' => 'Main Store',
            'is_default' => true,
        ];
    }
}
