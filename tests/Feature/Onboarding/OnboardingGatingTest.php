<?php

namespace Tests\Feature\Onboarding;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingGatingTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: User, 1: Tenant} */
    protected function tenantUser(bool $onboarded): array
    {
        $tenant = Tenant::factory()->state(['onboarding_completed_at' => $onboarded ? now() : null])->create();

        return [User::factory()->forTenant($tenant)->create(), $tenant];
    }

    public function test_an_incomplete_tenant_is_redirected_from_management_modules(): void
    {
        [$user] = $this->tenantUser(false);

        foreach (['/dashboard', '/menu', '/pos', '/orders', '/reports'] as $path) {
            $this->actingAs($user)
                ->get($path)
                ->assertRedirect(route('onboarding.show', 'profile'));
        }
    }

    public function test_unverified_users_cannot_reach_the_wizard(): void
    {
        $tenant = Tenant::factory()->notOnboarded()->create();
        $user = User::factory()->forTenant($tenant)->unverified()->create();

        $this->actingAs($user)
            ->get('/onboarding/profile')
            ->assertRedirect(route('verification.notice'));
    }

    public function test_a_completed_tenant_is_not_redirected(): void
    {
        [$user] = $this->tenantUser(true);

        $this->actingAs($user)->get('/dashboard')->assertOk();
    }

    public function test_onboarding_routes_remain_reachable_while_incomplete(): void
    {
        [$user] = $this->tenantUser(false);

        $this->actingAs($user)->get('/onboarding/company')->assertOk();
    }

    public function test_platform_admins_are_not_gated(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        $this->actingAs($admin)->get('/platform')->assertOk();
    }
}
