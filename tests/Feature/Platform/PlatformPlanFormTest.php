<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformPlanFormTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(RoleName $role = RoleName::SaasSuperAdmin): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole($role);

        return $admin;
    }

    public function test_create_form_renders_with_feature_options(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform/plans/create')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Plans/Form')
                ->where('plan', null)
                ->has('feature_options', 10)
                ->has('limit_keys', 3));
    }

    public function test_edit_form_renders_with_the_plan(): void
    {
        $admin = $this->admin();
        $plan = Plan::where('slug', 'starter')->firstOrFail();

        $this->actingAs($admin)->get("/platform/plans/{$plan->id}/edit")->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Plans/Form')
                ->where('plan.slug', 'starter')
                ->where('plan.limits.branches', 1));
    }

    public function test_a_plan_can_still_be_created_with_the_new_payload(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/plans', [
            'name' => 'Enterprise',
            'slug' => 'enterprise',
            'description' => 'Multi-branch',
            'currency' => 'USD',
            'visibility' => 'public',
            'price_monthly' => 199,
            'price_yearly' => 1990,
            'trial_days' => 14,
            'is_active' => true,
            'features' => ['pos', 'kitchen', 'reports'],
            'limits' => ['branches' => 5, 'users' => 50, 'orders_this_month' => null],
            'prices' => [
                ['currency' => 'USD', 'interval' => 'monthly', 'price' => 199],
                ['currency' => 'USD', 'interval' => 'yearly', 'price' => 1990],
            ],
        ])->assertRedirect();

        $plan = Plan::where('slug', 'enterprise')->firstOrFail();
        $this->assertSame(5, $plan->limit('branches'));
        $this->assertNull($plan->limit('orders_this_month'));
        $this->assertTrue($plan->hasFeature('pos'));
    }

    public function test_form_requires_plan_manage_permission(): void
    {
        // Billing admin can view plans but not manage them.
        $admin = $this->admin(RoleName::BillingAdmin);

        $this->actingAs($admin)->get('/platform/plans/create')->assertForbidden();
    }
}
