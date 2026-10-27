<?php

namespace Tests\Feature\Realtime;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Notifications\PlatformNotificationService;
use App\Domain\Realtime\Events\PlatformAlert;
use App\Domain\Realtime\RealtimeManager;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Actions\RegisterTenant;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Events\Failed;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class PlatformAlertsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    protected function enableRealtime(): void
    {
        $realtime = app(RealtimeManager::class);
        $realtime->setDriver('pusher');
        $realtime->setCredentials('pusher', ['app_id' => '1', 'key' => 'k', 'secret' => 's', 'cluster' => 'ap2']);
    }

    /** @return array<string, mixed> */
    protected function notificationData(User $user): array
    {
        $row = DB::table('notifications')->where('notifiable_id', $user->getKey())->latest('created_at')->first();

        return $row ? (array) json_decode((string) $row->data, true) : [];
    }

    protected function manualInvoice(): \App\Domain\Subscriptions\Models\SubscriptionInvoice
    {
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        app(SubscriptionService::class)->activate($subscription);

        return app(SubscriptionService::class)->issueInvoice($subscription->fresh());
    }

    public function test_a_manual_payment_alerts_every_admin_who_handles_payments(): void
    {
        $admin = $this->admin();
        $outsider = User::factory()->platformAdmin()->create(); // platform admin, no role → no permissions

        $config = PaymentGateway::create([
            'name' => 'Manual',
            'provider' => 'manual',
            'environment' => 'production',
            'is_enabled' => true,
            'supported_currencies' => [],
        ]);

        $invoice = $this->manualInvoice();

        $this->enableRealtime();
        Event::fake([PlatformAlert::class]);

        $this->actingAs($admin)->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);

        $payment = PlatformPayment::firstOrFail();
        $this->assertSame('pending', $payment->status->value);

        Event::assertDispatched(PlatformAlert::class, fn (PlatformAlert $event) => $event->area === 'payments'
            && $event->level === 'warning'
            && str_contains($event->title, 'Manual payment')
            && str_contains((string) $event->broadcastOn()[0], 'platform.payments'));

        $this->assertSame('Manual payment awaiting approval', $this->notificationData($admin)['title']);
        $this->assertSame(0, DB::table('notifications')->where('notifiable_id', $outsider->getKey())->count());
    }

    public function test_the_unread_bell_count_is_shared_with_platform_admins_only(): void
    {
        $admin = $this->admin();

        app(PlatformNotificationService::class)->send('payments', 'platform.payments.view', 'Heads up', 'Something happened.', 'info');

        $this->actingAs($admin)->get('/platform/realtime')->assertOk()
            ->assertInertia(fn ($page) => $page->where('platform_notifications.unread', 1));

        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->where('platform_notifications.unread', 0));
    }

    public function test_a_new_tenant_registration_alerts_the_tenant_area(): void
    {
        $admin = $this->admin();

        $this->enableRealtime();
        Event::fake([PlatformAlert::class]);

        app(RegisterTenant::class)->execute([
            'name' => 'Owner',
            'email' => 'owner@example.test',
            'password' => 'password123',
            'restaurant_name' => 'Test Kitchen',
        ]);

        Event::assertDispatched(PlatformAlert::class, fn (PlatformAlert $event) => $event->area === 'tenants'
            && str_contains($event->body, 'Test Kitchen'));

        $this->assertSame('New tenant registered', $this->notificationData($admin)['title']);
    }

    public function test_a_failed_queue_job_alerts_the_operations_area(): void
    {
        $admin = $this->admin();

        $this->enableRealtime();
        Event::fake([PlatformAlert::class]);

        $job = Mockery::mock(Job::class);
        $job->shouldReceive('resolveName')->andReturn('App\\Jobs\\OpenKitchenTicket');

        event(new JobFailed('database', $job, new RuntimeException('Connection refused')));

        Event::assertDispatched(PlatformAlert::class, fn (PlatformAlert $event) => $event->area === 'ops'
            && str_contains($event->body, 'OpenKitchenTicket'));

        $this->assertSame('Queued job failed', $this->notificationData($admin)['title']);
    }

    public function test_a_failed_sign_in_on_an_admin_account_alerts_once_per_ten_minutes(): void
    {
        $admin = $this->admin();

        $this->enableRealtime();
        Event::fake([PlatformAlert::class]);

        event(new Failed('web', null, ['email' => $admin->email]));
        event(new Failed('web', null, ['email' => $admin->email]));

        $this->assertSame(1, DB::table('notifications')->where('notifiable_id', $admin->getKey())->count());
        $this->assertSame('Failed sign-in on an admin account', $this->notificationData($admin)['title']);
        Event::assertDispatchedTimes(PlatformAlert::class, 1);
    }

    public function test_a_failed_sign_in_for_an_unknown_address_is_only_recorded(): void
    {
        $admin = $this->admin();

        $this->enableRealtime();
        Event::fake([PlatformAlert::class]);

        event(new Failed('web', null, ['email' => 'nobody@example.test']));

        Event::assertNotDispatched(PlatformAlert::class);
        $this->assertSame(0, DB::table('notifications')->count());
        $this->assertDatabaseHas('security_events', ['event' => 'login_failed', 'email' => 'nobody@example.test']);
    }
}
