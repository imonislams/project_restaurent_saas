<?php

namespace Tests\Feature\Platform;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Security\Models\SecurityEvent;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PlatformSecurityTest extends TestCase
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

    public function test_platform_administrator_can_be_created_with_platform_roles(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/admins', [
            'name' => 'Billing Person',
            'email' => 'billing-admin@example.com',
            'password' => 'password123',
            'roles' => [RoleName::BillingAdmin->value],
        ])->assertRedirect();

        $created = User::where('email', 'billing-admin@example.com')->firstOrFail();
        $this->assertTrue($created->isPlatformAdmin());
        $this->assertTrue($created->hasRole(RoleName::BillingAdmin));
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.admin_created']);
    }

    public function test_only_platform_roles_can_be_assigned_to_an_administrator(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/admins', [
            'name' => 'Sneaky',
            'email' => 'sneaky@example.com',
            'password' => 'password123',
            'roles' => [RoleName::TenantOwner->value],
        ])->assertSessionHasErrors('roles.0');

        $this->assertDatabaseMissing('users', ['email' => 'sneaky@example.com']);
    }

    public function test_admin_roles_update_records_before_and_after(): void
    {
        $admin = $this->admin();
        $target = User::factory()->platformAdmin()->create();
        $target->assignRole(RoleName::PlatformAuditor);

        $this->actingAs($admin)->patch("/platform/admins/{$target->id}", [
            'roles' => [RoleName::PlatformAdmin->value],
        ])->assertRedirect();

        $this->assertTrue($target->fresh()->hasRole(RoleName::PlatformAdmin));

        $log = AuditLog::where('action', 'platform.admin_roles_updated')->latest('id')->firstOrFail();
        $this->assertSame([RoleName::PlatformAuditor->value], $log->metadata['before']['roles']);
        $this->assertSame([RoleName::PlatformAdmin->value], $log->metadata['after']['roles']);
    }

    public function test_self_deactivation_is_blocked_but_other_admins_can_be_deactivated(): void
    {
        $admin = $this->admin();
        $other = User::factory()->platformAdmin()->create();
        $other->assignRole(RoleName::PlatformAdmin);

        $this->actingAs($admin)->post("/platform/admins/{$admin->id}/deactivate")->assertStatus(422);

        DB::table('sessions')->insert([
            'id' => 'sess-1', 'user_id' => $other->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'test', 'payload' => 'x', 'last_activity' => time(),
        ]);

        $this->actingAs($admin)->post("/platform/admins/{$other->id}/deactivate")->assertRedirect();

        $this->assertSame('deactivated', $other->fresh()->status);
        $this->assertDatabaseMissing('sessions', ['id' => 'sess-1']);
    }

    public function test_role_permissions_can_be_updated_but_super_admin_is_locked(): void
    {
        $admin = $this->admin();
        $auditor = Role::where('slug', RoleName::PlatformAuditor->value)->firstOrFail();

        $this->actingAs($admin)->patch("/platform/roles/{$auditor->id}", [
            'permissions' => ['platform.audit.view', 'platform.payments.view'],
        ])->assertRedirect();

        $auditor->refresh();
        $this->assertTrue($auditor->hasPermission('platform.payments.view'));
        $this->assertFalse($auditor->hasPermission('platform.tenants.view'));
        $this->assertDatabaseHas('security_events', ['event' => 'platform_role_permissions_updated']);

        $superAdmin = Role::where('slug', RoleName::SaasSuperAdmin->value)->firstOrFail();
        $this->actingAs($admin)->patch("/platform/roles/{$superAdmin->id}", ['permissions' => []])->assertStatus(422);
    }

    public function test_login_and_failed_login_are_recorded_as_security_events(): void
    {
        $user = User::factory()->platformAdmin()->create([
            'email' => 'sec@example.com',
            'password' => Hash::make('correct-password'),
        ]);

        $this->post('/login', ['email' => 'sec@example.com', 'password' => 'wrong-password']);
        $this->assertDatabaseHas('security_events', ['event' => 'login_failed', 'email' => 'sec@example.com']);

        $this->post('/login', ['email' => 'sec@example.com', 'password' => 'correct-password']);
        $this->assertDatabaseHas('security_events', ['event' => 'login', 'user_id' => $user->id]);
    }

    public function test_audit_log_filters_and_csv_export(): void
    {
        $admin = $this->admin();
        AuditLog::create(['action' => 'platform.tenant_suspended', 'user_id' => $admin->id, 'metadata' => ['reason' => 'x']]);
        AuditLog::create(['action' => 'platform.plan_created', 'user_id' => $admin->id]);

        $this->actingAs($admin)->get('/platform/audit?action=tenant_suspended')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Audit')->has('logs.data', 1));

        $response = $this->actingAs($admin)->get('/platform/audit/export');
        $response->assertOk();
        $this->assertStringContainsString('platform.tenant_suspended', $response->streamedContent());
    }

    public function test_impersonation_history_lists_start_and_stop_events(): void
    {
        $admin = $this->admin();
        AuditLog::create(['action' => 'platform.impersonation_started', 'user_id' => $admin->id, 'tenant_id' => null, 'metadata' => ['reason' => 'Support']]);

        $this->actingAs($admin)->get('/platform/impersonation-history')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Security/Impersonation')->has('logs.data', 1));
    }

    public function test_security_center_permissions_are_enforced(): void
    {
        $billing = User::factory()->platformAdmin()->create();
        $billing->assignRole(RoleName::BillingAdmin);

        $this->actingAs($billing)->get('/platform/admins')->assertForbidden();
        $this->actingAs($billing)->get('/platform/roles')->assertForbidden();
        $this->actingAs($billing)->get('/platform/security-events')->assertForbidden();

        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::PlatformAuditor);

        $this->actingAs($auditor)->get('/platform/security-events')->assertOk();
        $this->actingAs($auditor)->get('/platform/audit')->assertOk();
        $this->actingAs($auditor)->get('/platform/admins')->assertForbidden();
    }
}
