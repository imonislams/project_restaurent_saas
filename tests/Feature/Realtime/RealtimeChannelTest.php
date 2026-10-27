<?php

namespace Tests\Feature\Realtime;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Realtime\ChannelAccess;
use App\Domain\Realtime\Events\RealtimeTestEvent;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealtimeChannelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_a_member_may_join_their_own_tenant_area(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->assertTrue(ChannelAccess::tenant($owner, $tenant->getKey(), 'orders.view'));
        // Areas without a permission requirement (the dashboard) need membership only.
        $this->assertTrue(ChannelAccess::tenant($owner, $tenant->getKey()));
    }

    public function test_an_area_requires_its_permission(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        // Tenant roles never hold platform permissions, so this is always denied.
        $this->assertTrue($owner->hasPermission('orders.view'));
        $this->assertFalse(ChannelAccess::tenant($owner, $tenant->getKey(), 'platform.settings.manage'));
    }

    public function test_another_tenants_area_is_refused(): void
    {
        $tenant = Tenant::factory()->create();
        $other = Tenant::factory()->create();

        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->assertFalse(ChannelAccess::tenant($owner, $other->getKey(), 'orders.view'));
        $this->assertFalse(ChannelAccess::tenant($owner, $other->getKey()));
    }

    public function test_platform_channels_require_the_matching_platform_permission(): void
    {
        $superAdmin = User::factory()->platformAdmin()->create();
        $superAdmin->assignRole(RoleName::SaasSuperAdmin);

        $billing = User::factory()->platformAdmin()->create();
        $billing->assignRole(RoleName::BillingAdmin);

        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->assertTrue(ChannelAccess::platform($superAdmin, 'platform.settings.manage'));
        $this->assertTrue(ChannelAccess::platform($superAdmin, 'platform.payments.view'));

        $this->assertTrue(ChannelAccess::platform($billing, 'platform.payments.view'));
        $this->assertFalse(ChannelAccess::platform($billing, 'platform.settings.manage'));

        $this->assertFalse(ChannelAccess::platform($owner, 'platform.payments.view'));
    }

    public function test_the_test_event_targets_the_admins_private_channel(): void
    {
        $event = new RealtimeTestEvent(42, 'Test event.', now()->toIso8601String());

        $channels = $event->broadcastOn();

        $this->assertCount(1, $channels);
        $this->assertSame('private-App.Models.User.42', (string) $channels[0]);
        $this->assertSame('realtime.test', $event->broadcastAs());
        $this->assertSame('Test event.', $event->broadcastWith()['message']);
    }
}
