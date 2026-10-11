<?php

namespace App\Domain\Inventory\Factories;

use App\Domain\Inventory\Models\Unit;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => 'Kilogram',
            'code' => 'kg',
        ];
    }
}
