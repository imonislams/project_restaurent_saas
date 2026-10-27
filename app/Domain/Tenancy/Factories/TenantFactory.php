<?php

namespace App\Domain\Tenancy\Factories;

use App\Domain\Subscriptions\Enums\PlanFeature;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
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

    /**
     * A fully provisioned restaurant also has a working subscription — without one
     * the workspace is closed (see EnsureSubscriptionAccess). The fixture plan
     * carries every feature and no limits, so feature behaviour is unchanged.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (Tenant $tenant) {
            if ($tenant->subscription()->exists()) {
                return;
            }

            $plan = Plan::query()->firstOrCreate(
                ['slug' => 'factory-plan'],
                [
                    'name' => 'Factory Plan',
                    'description' => 'Test fixture: every feature, no limits.',
                    'price_monthly' => 0,
                    'price_yearly' => 0,
                    'trial_days' => 14,
                    'features' => array_map(fn (PlanFeature $feature) => $feature->value, PlanFeature::cases()),
                    'limits' => [],
                    'is_active' => true,
                    'visibility' => 'hidden',
                    'sort_order' => 999,
                ],
            );

            Subscription::create([
                'tenant_id' => $tenant->getKey(),
                'plan_id' => $plan->getKey(),
                'status' => SubscriptionStatus::Active,
                'billing_cycle' => 'monthly',
                'current_period_start' => now(),
                'current_period_end' => now()->addMonth(),
            ]);
        });
    }

    /** A tenant with no subscription row at all (lapsed / never provisioned). */
    public function withoutSubscription(): static
    {
        return $this->afterCreating(fn (Tenant $tenant) => $tenant->subscription()->delete());
    }

    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 99999),
            'business_email' => fake()->unique()->companyEmail(),
            'status' => TenantStatus::Active,
            'trial_ends_at' => now()->addDays(14),
            // A factory tenant is a fully provisioned, ready-to-use restaurant.
            'onboarding_completed_at' => now(),
        ];
    }

    public function notOnboarded(): static
    {
        return $this->state(fn () => ['onboarding_completed_at' => null]);
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
