<?php

namespace Tests\Feature\Onboarding;

use App\Domain\Demo\DemoDataService;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoSetupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        Queue::fake();
        Notification::fake();
        Mail::fake();
    }

    /** @return array{0: Tenant, 1: User} */
    protected function tenantAtReviewStep(): array
    {
        $tenant = Tenant::factory()->notOnboarded()->create();

        $tenant->mergeSettings([
            'profile' => ['completed_at' => now()->toIso8601String()],
            'company' => ['legal_name' => 'Review Foods'],
            'region' => ['country' => 'BD', 'currency' => 'BDT', 'timezone' => 'Asia/Dhaka'],
        ]);
        $tenant->save();

        $branch = $tenant->branches()->create([
            'name' => 'Main Branch',
            'code' => 'MAIN',
            'currency' => 'BDT',
            'timezone' => 'Asia/Dhaka',
            'service_types' => ['dine_in'],
            'is_active' => true,
            'is_primary' => true,
        ]);

        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);
        $user->syncBranchAccess([$branch->getKey()]);

        return [$tenant, $user];
    }

    public function test_the_review_step_offers_sample_data(): void
    {
        [, $user] = $this->tenantAtReviewStep();

        $this->actingAs($user)
            ->get('/onboarding/review')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Onboarding/Show')
                ->where('step', 'review')
                ->where('form.demo.days', DemoDataService::DEFAULT_DAYS));
    }

    public function test_completing_without_choosing_starts_the_demo(): void
    {
        [$tenant, $user] = $this->tenantAtReviewStep();

        $this->actingAs($user)
            ->post('/onboarding/complete')
            ->assertRedirect(route('demo.setup'));

        $this->assertNotNull($tenant->fresh()->onboarding_completed_at);
        $this->assertDatabaseHas('demo_data_batches', [
            'tenant_id' => $tenant->getKey(),
            'status' => DemoDataBatch::STATUS_PENDING,
            'days' => DemoDataService::DEFAULT_DAYS,
        ]);
    }

    public function test_completing_with_sample_data_switched_off_starts_empty(): void
    {
        [$tenant, $user] = $this->tenantAtReviewStep();

        $this->actingAs($user)
            ->post('/onboarding/complete', ['demo_enabled' => false])
            ->assertRedirect(route('dashboard'));

        $this->assertNotNull($tenant->fresh()->onboarding_completed_at);
        $this->assertDatabaseMissing('demo_data_batches', ['tenant_id' => $tenant->getKey()]);
    }
}
