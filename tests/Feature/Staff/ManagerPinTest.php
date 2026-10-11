<?php

namespace Tests\Feature\Staff;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagerPinTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_an_approver_can_set_a_manager_pin(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        $this->actingAs($owner)->put('/profile/manager-pin', [
            'pin' => '4321',
            'pin_confirmation' => '4321',
        ])->assertRedirect();

        $this->assertTrue($owner->fresh()->hasManagerPin());
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.manager_pin_set']);
    }

    public function test_a_non_approver_cannot_set_a_manager_pin(): void
    {
        $tenant = Tenant::factory()->create();
        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->put('/profile/manager-pin', [
            'pin' => '4321',
            'pin_confirmation' => '4321',
        ])->assertForbidden();
    }

    public function test_verify_resolves_the_approving_manager_by_pin(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        app(ManagerPinService::class)->set($owner, '9876');

        $resolved = app(ManagerPinService::class)->verify($tenant, '9876');

        $this->assertNotNull($resolved);
        $this->assertTrue($resolved->is($owner));
        $this->assertDatabaseHas('audit_logs', ['action' => 'approval.pin_verified']);
    }

    public function test_verify_rejects_the_wrong_pin_and_audits_the_failure(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        app(ManagerPinService::class)->set($owner, '9876');

        $this->assertNull(app(ManagerPinService::class)->verify($tenant, '0000'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'approval.pin_failed']);
    }

    public function test_verify_ignores_users_without_approval_permission(): void
    {
        $tenant = Tenant::factory()->create();
        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        // Even if a PIN were somehow set, a cashier cannot approve.
        $cashier->forceFill(['manager_pin' => bcrypt('1111')])->save();

        $this->assertNull(app(ManagerPinService::class)->verify($tenant, '1111'));
    }
}
