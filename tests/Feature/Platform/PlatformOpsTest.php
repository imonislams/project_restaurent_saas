<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Monitoring\Models\ApplicationLog;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class PlatformOpsTest extends TestCase
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

    protected function tenantOwner(): User
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        return $owner;
    }

    public function test_application_warnings_are_captured_and_redacted(): void
    {
        Log::warning('Payment gateway slow', ['password' => 'secret', 'request_id' => 'req-123']);

        $log = ApplicationLog::query()->where('message', 'Payment gateway slow')->first();

        $this->assertNotNull($log);
        $this->assertSame('warning', $log->level);
        $this->assertSame('[redacted]', $log->context['password']);
        $this->assertSame('req-123', $log->request_id);
    }

    public function test_queue_page_renders_and_failed_jobs_can_be_forgotten(): void
    {
        $admin = $this->admin();
        $uuid = (string) Str::uuid();

        DB::table('failed_jobs')->insert([
            'uuid' => $uuid,
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{}',
            'exception' => 'Something broke',
            'failed_at' => now(),
        ]);

        $this->actingAs($admin)->get('/platform/ops/queue')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Ops/Queue'));

        $this->actingAs($admin)->delete("/platform/ops/failed-jobs/{$uuid}")->assertRedirect();
        $this->assertDatabaseMissing('failed_jobs', ['uuid' => $uuid]);
    }

    public function test_schedule_and_logs_pages_render(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->get('/platform/ops/schedule')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Ops/Schedule')->has('events'));

        $this->actingAs($admin)->get('/platform/ops/logs')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Ops/Logs'));
    }

    public function test_maintenance_mode_blocks_tenants_but_not_platform_or_health(): void
    {
        $settings = app(PlatformSettings::class);
        $settings->set('maintenance.enabled', true, 'maintenance');
        $settings->set('maintenance.message', 'Back soon', 'maintenance');

        $owner = $this->tenantOwner();
        $this->actingAs($owner)->get('/dashboard')->assertStatus(503);

        $this->get('/health')->assertOk();

        $this->actingAs($this->admin())->get('/platform')->assertOk();
    }

    public function test_maintenance_mode_can_be_disabled(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/maintenance', [
            'enabled' => false,
            'message' => '',
        ])->assertRedirect();

        $this->assertFalse((bool) app(PlatformSettings::class)->get('maintenance.enabled', false));

        $this->actingAs($this->tenantOwner())->get('/dashboard')->assertOk();
    }

    public function test_auditor_without_monitoring_permission_is_forbidden(): void
    {
        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::PlatformAuditor);

        // Auditor has logs.view but not monitoring.view.
        $this->actingAs($auditor)->get('/platform/ops/logs')->assertOk();
        $this->actingAs($auditor)->get('/platform/ops/queue')->assertForbidden();
        $this->actingAs($auditor)->get('/platform/maintenance')->assertForbidden();
    }
}
