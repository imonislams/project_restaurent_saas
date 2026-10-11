<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Tenancy\Models\Tenant;
use App\Jobs\RecordUsageSnapshot;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SubscriptionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    public function test_expired_trials_move_to_past_due(): void
    {
        $tenant = Tenant::factory()->create();
        $plan = Plan::where('slug', 'starter')->firstOrFail();

        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Trialing,
            'billing_cycle' => 'monthly',
            'trial_ends_at' => now()->subDay(),
            'current_period_start' => now()->subDays(15),
            'current_period_end' => now()->subDay(),
        ]);

        $this->artisan('subscriptions:process')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::PastDue, Subscription::withoutGlobalScopes()->first()->status);
    }

    public function test_past_due_subscriptions_are_suspended_after_grace(): void
    {
        $tenant = Tenant::factory()->create();
        $plan = Plan::where('slug', 'starter')->firstOrFail();

        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::PastDue,
            'billing_cycle' => 'monthly',
            'current_period_end' => now()->subDays(10),
        ]);

        $this->artisan('subscriptions:process')->assertSuccessful();

        $this->assertSame(SubscriptionStatus::Suspended, Subscription::withoutGlobalScopes()->first()->status);
        $this->assertSame('suspended', $tenant->fresh()->status->value);
    }

    public function test_expiring_subscriptions_are_warned(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $plan = Plan::where('slug', 'starter')->firstOrFail();
        Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'billing_cycle' => 'monthly',
            'current_period_end' => now()->addDays(5),
        ]);

        $this->artisan('billing:warn-expiring')->assertSuccessful();

        $this->assertSame(1, $owner->notifications()->count());
    }

    public function test_usage_snapshot_command_dispatches_a_job(): void
    {
        Queue::fake();

        $this->artisan('usage:record')->assertSuccessful();

        Queue::assertPushed(RecordUsageSnapshot::class);
    }

    public function test_the_schedule_registers_the_recurring_tasks(): void
    {
        $tasks = collect(app(Schedule::class)->events())
            ->map(fn ($event) => $event->command)
            ->implode(' ');

        $this->assertStringContainsString('subscriptions:process', $tasks);
        $this->assertStringContainsString('alerts:low-stock', $tasks);
        $this->assertStringContainsString('notifications:daily-sales', $tasks);
        $this->assertStringContainsString('billing:warn-expiring', $tasks);
        $this->assertStringContainsString('usage:record', $tasks);
    }
}
