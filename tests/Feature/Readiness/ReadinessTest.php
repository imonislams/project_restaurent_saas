<?php

namespace Tests\Feature\Readiness;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use App\Support\DatabaseBackup;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReadinessTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_health_endpoint_reports_ok(): void
    {
        $response = $this->get('/health');

        $response->assertOk()
            ->assertJsonPath('status', 'ok');

        $this->assertTrue($response->json('checks.database.ok'));
        $this->assertTrue($response->json('checks.cache.ok'));
        $this->assertTrue($response->json('checks.storage.ok'));
    }

    public function test_the_health_command_succeeds(): void
    {
        $this->artisan('app:health')->assertSuccessful();
    }

    public function test_responses_carry_a_request_id_and_security_headers(): void
    {
        $response = $this->get('/login');

        $response->assertOk();
        $this->assertNotEmpty($response->headers->get('X-Request-ID'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame('SAMEORIGIN', $response->headers->get('X-Frame-Options'));
        $this->assertSame('strict-origin-when-cross-origin', $response->headers->get('Referrer-Policy'));
    }

    public function test_a_supplied_request_id_is_echoed_back(): void
    {
        $response = $this->withHeaders(['X-Request-ID' => 'trace-abc-123'])->get('/login');

        $this->assertSame('trace-abc-123', $response->headers->get('X-Request-ID'));
    }

    public function test_a_backup_is_created_and_can_be_verified(): void
    {
        Storage::fake('local');

        $this->artisan('db:backup')->assertSuccessful();

        $files = Storage::disk('local')->files(DatabaseBackup::DIRECTORY);
        $this->assertCount(1, $files);

        $this->artisan('db:verify-backup')->assertSuccessful();
    }

    public function test_verifying_a_missing_backup_fails(): void
    {
        Storage::fake('local');

        $this->artisan('db:verify-backup')->assertFailed();
    }

    public function test_entitlement_cache_is_invalidated_when_the_plan_changes(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);

        $tenant = Tenant::factory()->create();
        $starter = Plan::where('slug', 'starter')->firstOrFail();
        $growth = Plan::where('slug', 'growth')->firstOrFail();

        app(TenantContext::class)->set($tenant);
        $subscription = app(SubscriptionService::class)->startTrial($tenant, $starter);

        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        // Prime the cache.
        $this->assertFalse($tenant->hasFeature('purchasing'));

        app(SubscriptionService::class)->changePlan($subscription, $growth, BillingCycle::Monthly, $owner);

        // Cache must be invalidated -> new entitlement is visible immediately.
        $this->assertTrue($tenant->fresh()->hasFeature('purchasing'));
    }
}
