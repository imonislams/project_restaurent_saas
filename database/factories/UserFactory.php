<?php

namespace Database\Factories;

use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'is_platform_admin' => false,
            'status' => 'active',
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Attach the user to a tenant (creating one if none is supplied).
     */
    public function forTenant(Tenant|int|null $tenant = null): static
    {
        return $this->state(fn () => [
            'tenant_id' => $tenant instanceof Tenant
                ? $tenant->getKey()
                : ($tenant ?? Tenant::factory()->create()->getKey()),
        ]);
    }

    /**
     * Indicate that the user is a platform administrator.
     */
    public function platformAdmin(): static
    {
        return $this->state(fn () => [
            'tenant_id' => null,
            'is_platform_admin' => true,
        ]);
    }

    /**
     * Indicate that the user account is deactivated.
     */
    public function deactivated(): static
    {
        return $this->state(fn () => [
            'status' => 'deactivated',
            'deactivated_at' => now(),
        ]);
    }
}
