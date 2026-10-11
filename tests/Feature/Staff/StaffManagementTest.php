<?php

namespace Tests\Feature\Staff;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Identity\Notifications\StaffInvitationNotification;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class StaffManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(Tenant $tenant): User
    {
        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    public function test_owner_can_view_the_staff_page(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)
            ->get('/staff')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Staff/Index'));
    }

    public function test_cashier_cannot_view_the_staff_page(): void
    {
        $tenant = Tenant::factory()->create();
        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/staff')->assertForbidden();
    }

    public function test_owner_can_invite_staff_and_a_notification_is_sent(): void
    {
        Notification::fake();

        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)->post('/staff', [
            'name' => 'New Cashier',
            'email' => 'cashier@example.com',
            'roles' => [RoleName::Cashier->value],
            'branch_ids' => [],
        ])->assertRedirect();

        $this->assertDatabaseHas('invitations', [
            'tenant_id' => $tenant->id,
            'email' => 'cashier@example.com',
        ]);

        Notification::assertSentOnDemand(StaffInvitationNotification::class);

        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.invited']);
    }

    public function test_platform_role_cannot_be_invited(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);

        $this->actingAs($owner)->post('/staff', [
            'email' => 'spy@example.com',
            'roles' => [RoleName::SaasSuperAdmin->value],
        ])->assertSessionHasErrors('roles.*');
    }

    public function test_cannot_invite_an_existing_user(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        User::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($owner)->post('/staff', [
            'email' => 'taken@example.com',
            'roles' => [RoleName::Cashier->value],
        ])->assertSessionHasErrors('email');
    }

    public function test_invitation_can_be_accepted_creating_a_user_with_roles_and_branch_access(): void
    {
        $tenant = Tenant::factory()->create();
        $branch = Branch::factory()->create(['tenant_id' => $tenant->id]);
        $plain = 'plain-invite-token-value';

        Invitation::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'cashier@example.com',
            'name' => 'Cashier One',
            'roles' => [RoleName::Cashier->value],
            'branch_ids' => [$branch->id],
            'token' => Invitation::hashToken($plain),
        ]);

        $this->post("/invitations/{$plain}", [
            'name' => 'Cashier One',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticated();

        $user = User::where('email', 'cashier@example.com')->firstOrFail();
        $this->assertSame($tenant->id, $user->tenant_id);
        $this->assertTrue($user->hasRole(RoleName::Cashier));
        $this->assertTrue($user->canAccessBranch($branch));
        $this->assertNotNull($user->email_verified_at);

        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.invitation_accepted']);
    }

    public function test_expired_invitation_cannot_be_accepted(): void
    {
        $tenant = Tenant::factory()->create();
        $plain = 'expired-token';

        Invitation::factory()->expired()->create([
            'tenant_id' => $tenant->id,
            'roles' => [RoleName::Cashier->value],
            'token' => Invitation::hashToken($plain),
        ]);

        $this->post("/invitations/{$plain}", [
            'name' => 'Too Late',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_owner_can_update_access_and_it_is_audited(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $staff = User::factory()->forTenant($tenant)->create();
        $staff->assignRole(RoleName::Cashier);

        $branch = Branch::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($owner)->patch("/staff/{$staff->id}", [
            'roles' => [RoleName::Supervisor->value],
            'branch_ids' => [$branch->id],
        ])->assertRedirect();

        $staff->refresh();
        $this->assertTrue($staff->hasRole(RoleName::Supervisor));
        $this->assertFalse($staff->hasRole(RoleName::Cashier));
        $this->assertTrue($staff->canAccessBranch($branch));

        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.access_updated']);
    }

    public function test_deactivation_is_audited_and_self_deactivation_is_blocked(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $staff = User::factory()->forTenant($tenant)->create();

        $this->actingAs($owner)->post("/staff/{$staff->id}/deactivate")->assertRedirect();
        $this->assertSame('deactivated', $staff->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.deactivated']);

        $this->actingAs($owner)->post("/staff/{$owner->id}/deactivate")->assertForbidden();
    }

    public function test_reactivation_restores_access(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $staff = User::factory()->forTenant($tenant)->create(['status' => 'deactivated', 'deactivated_at' => now()]);

        $this->actingAs($owner)->post("/staff/{$staff->id}/reactivate")->assertRedirect();

        $this->assertTrue($staff->fresh()->isActive());
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.reactivated']);
    }

    public function test_revoking_sessions_removes_session_rows(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $staff = User::factory()->forTenant($tenant)->create();

        DB::table('sessions')->insert([
            'id' => 'sess-1',
            'user_id' => $staff->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => 'x',
            'last_activity' => time(),
        ]);

        $this->actingAs($owner)->post("/staff/{$staff->id}/revoke-sessions")->assertRedirect();

        $this->assertDatabaseMissing('sessions', ['user_id' => $staff->id]);
    }

    public function test_cannot_manage_staff_from_another_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $ownerA = $this->owner($tenantA);
        $staffB = User::factory()->forTenant($tenantB)->create();

        $this->actingAs($ownerA)
            ->patch("/staff/{$staffB->id}", ['roles' => [RoleName::Cashier->value]])
            ->assertForbidden();
    }

    public function test_branch_access_is_restricted(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $branchA = Branch::factory()->create(['tenant_id' => $tenant->id]);
        $branchB = Branch::factory()->create(['tenant_id' => $tenant->id]);

        $cashier = User::factory()->forTenant($tenant)->create();
        $cashier->assignRole(RoleName::Cashier);
        $cashier->syncBranchAccess([$branchA->id]);

        $this->assertTrue($cashier->canAccessBranch($branchA));
        $this->assertFalse($cashier->canAccessBranch($branchB));
        $this->assertEqualsCanonicalizing([$branchA->id, $branchB->id], $owner->accessibleBranchIds());
    }
}
