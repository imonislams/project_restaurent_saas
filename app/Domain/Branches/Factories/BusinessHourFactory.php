<?php

namespace App\Domain\Branches\Factories;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Models\BusinessHour;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BusinessHour>
 */
class BusinessHourFactory extends Factory
{
    protected $model = BusinessHour::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn (array $attributes) => Branch::find($attributes['branch_id'])?->tenant_id,
            'branch_id' => Branch::factory(),
            'day_of_week' => fake()->unique()->numberBetween(0, 6),
            'is_closed' => false,
            'opens_at' => '09:00:00',
            'closes_at' => '22:00:00',
        ];
    }
}
