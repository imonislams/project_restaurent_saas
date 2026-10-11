<?php

namespace App\Domain\Branches\Factories;

use App\Domain\Branches\Enums\ServiceType;
use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Branch>
 */
class BranchFactory extends Factory
{
    protected $model = Branch::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->city().' Branch',
            'code' => strtoupper(fake()->unique()->bothify('BR-###')),
            'address' => fake()->address(),
            'phone' => fake()->phoneNumber(),
            'timezone' => null,
            'currency' => null,
            'service_types' => [ServiceType::DineIn->value, ServiceType::Takeaway->value],
            'is_active' => true,
            'is_primary' => false,
        ];
    }

    public function primary(): static
    {
        return $this->state(fn () => ['is_primary' => true]);
    }
}
