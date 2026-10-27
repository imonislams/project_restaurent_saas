<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Realtime\BroadcastConfigurator;
use App\Domain\Realtime\Events\RealtimeTestEvent;
use App\Domain\Realtime\RealtimeManager;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class RealtimeSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    protected function savePusher(): void
    {
        $realtime = app(RealtimeManager::class);
        $realtime->setDriver('pusher');
        $realtime->setCredentials('pusher', [
            'app_id' => '1874302',
            'key' => 'public-key',
            'secret' => 'supersecret',
            'cluster' => 'ap2',
        ]);
    }

    public function test_the_screen_renders_for_a_super_admin(): void
    {
        $this->actingAs($this->admin())->get('/platform/realtime')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Realtime/Index')
                ->has('drivers', 3)
                ->has('streams', 4)
                ->where('driver', 'off'));
    }

    public function test_a_driver_and_its_credentials_are_stored_encrypted(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/realtime', [
            'driver' => 'pusher',
            'credentials' => [
                'app_id' => '1874302',
                'key' => 'public-key',
                'secret' => 'supersecret',
                'cluster' => 'ap2',
            ],
        ])->assertRedirect();

        $raw = DB::table('platform_settings')->where('key', 'realtime.credentials.pusher')->value('value');
        $this->assertStringNotContainsString('supersecret', (string) $raw);
        $this->assertSame(1, (int) DB::table('platform_settings')->where('key', 'realtime.credentials.pusher')->value('is_encrypted'));

        $this->assertSame('supersecret', app(PlatformSettings::class)->get('realtime.credentials.pusher')['secret']);
        $this->assertTrue(app(RealtimeManager::class)->isConfigured('pusher'));

        // The secret never reaches the browser; the public key does.
        $this->actingAs($admin)->get('/platform/realtime')->assertOk()
            ->assertDontSee('supersecret')
            ->assertSee('public-key', false);
    }

    public function test_a_blank_credential_keeps_the_stored_secret(): void
    {
        $admin = $this->admin();
        $this->savePusher();

        $this->actingAs($admin)->post('/platform/realtime', [
            'driver' => 'pusher',
            'credentials' => ['app_id' => '1874302', 'key' => 'public-key', 'secret' => '', 'cluster' => 'ap2'],
        ])->assertRedirect();

        $this->assertSame('supersecret', app(RealtimeManager::class)->credentials('pusher')['secret']);
    }

    public function test_an_unknown_driver_is_rejected(): void
    {
        $this->actingAs($this->admin())->post('/platform/realtime', ['driver' => 'carrier-pigeon'])
            ->assertSessionHasErrors('driver');
    }

    public function test_streams_can_be_turned_off(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/realtime', [
            'driver' => 'off',
            'streams' => ['staff' => true, 'platform' => false],
        ])->assertRedirect();

        $realtime = app(RealtimeManager::class);
        $this->assertTrue($realtime->streamEnabled('staff'));
        $this->assertFalse($realtime->streamEnabled('platform'));

        $this->actingAs($admin)->get('/platform/realtime')->assertOk()
            ->assertInertia(fn ($page) => $page->where('streams.0.enabled', true)->where('streams.1.enabled', false));
    }

    public function test_the_configurator_applies_the_selected_driver(): void
    {
        $this->savePusher();

        app(BroadcastConfigurator::class)->apply();

        $this->assertSame('platform', config('broadcasting.default'));
        $this->assertSame('pusher', config('broadcasting.connections.platform.driver'));
        $this->assertSame('public-key', config('broadcasting.connections.platform.key'));
        $this->assertSame('supersecret', config('broadcasting.connections.platform.secret'));
        $this->assertSame('ap2', config('broadcasting.connections.platform.options.cluster'));
        $this->assertSame('api-ap2.pusher.com', config('broadcasting.connections.platform.options.host'));
        $this->assertTrue(config('broadcasting.connections.platform.options.useTLS'));
    }

    public function test_the_configurator_uses_the_reverb_host_and_port(): void
    {
        $realtime = app(RealtimeManager::class);
        $realtime->setDriver('reverb');
        $realtime->setCredentials('reverb', [
            'app_id' => 'app',
            'key' => 'reverb-key',
            'secret' => 'reverb-secret',
            'host' => 'ws.example.test',
            'port' => '8080',
            'scheme' => 'http',
        ]);

        app(BroadcastConfigurator::class)->apply();

        $this->assertSame('reverb', config('broadcasting.connections.platform.driver'));
        $this->assertSame('ws.example.test', config('broadcasting.connections.platform.options.host'));
        $this->assertSame(8080, config('broadcasting.connections.platform.options.port'));
        $this->assertFalse(config('broadcasting.connections.platform.options.useTLS'));

        // The Reverb server itself must accept the same app credentials.
        $this->assertSame('reverb-key', config('reverb.apps.apps.0.key'));
        $this->assertSame('reverb-secret', config('reverb.apps.apps.0.secret'));
        $this->assertSame('app', config('reverb.apps.apps.0.app_id'));
    }

    public function test_the_configurator_disables_broadcasting_when_there_is_no_driver(): void
    {
        app(BroadcastConfigurator::class)->apply();

        $this->assertSame('null', config('broadcasting.default'));
    }

    public function test_the_test_event_is_refused_while_realtime_is_off(): void
    {
        $admin = $this->admin();
        Event::fake();

        $this->actingAs($admin)->post('/platform/realtime/test')
            ->assertRedirect()
            ->assertSessionHas('error');

        Event::assertNotDispatched(RealtimeTestEvent::class);
    }

    public function test_the_test_event_is_sent_to_the_admins_own_channel(): void
    {
        $admin = $this->admin();
        $this->savePusher();
        Event::fake();

        $this->actingAs($admin)->post('/platform/realtime/test')
            ->assertRedirect()
            ->assertSessionHas('success');

        Event::assertDispatched(
            RealtimeTestEvent::class,
            fn (RealtimeTestEvent $event) => $event->userId === $admin->getKey()
                && (string) $event->broadcastOn()[0] === 'private-App.Models.User.'.$admin->getKey(),
        );
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.realtime_tested']);
    }

    public function test_a_platform_admin_without_the_manage_permission_cannot_change_settings(): void
    {
        $viewer = User::factory()->platformAdmin()->create();
        $viewer->assignRole(RoleName::PlatformAdmin);

        $this->actingAs($viewer)->get('/platform/realtime')->assertOk();
        $this->actingAs($viewer)->post('/platform/realtime', ['driver' => 'pusher'])->assertForbidden();
        $this->actingAs($viewer)->post('/platform/realtime/test')->assertForbidden();
    }

    public function test_a_tenant_user_cannot_reach_the_realtime_settings(): void
    {
        $tenant = \App\Domain\Tenancy\Models\Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->get('/platform/realtime')->assertForbidden();
    }
}
