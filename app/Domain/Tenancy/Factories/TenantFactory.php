<?php

namespace App\Domain\Tenancy\Factories;

use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'business_email' => fake()->unique()->companyEmail(),
            'status' => TenantStatus::Active,
            'trial_ends_at' => now()->addDays(14),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => TenantStatus::Pending]);
    }

    public function suspended(): static
    {
        return $this->state(fn () => [
            'status' => TenantStatus::Suspended,
            'suspended_at' => now(),
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['status' => TenantStatus::Archived]);
    }

    public function verified(): static
    {
        return $this->state(fn () => ['verified_at' => now()]);
    }
}
