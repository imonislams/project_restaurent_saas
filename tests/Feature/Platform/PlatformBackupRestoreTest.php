<?php

namespace Tests\Feature\Platform;

use App\Domain\BackupAndRecovery\BackupService;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\BackupAndRecovery\Models\BackupRestore;
use App\Domain\BackupAndRecovery\RestoreService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlatformBackupRestoreTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        Storage::fake('local');
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_platform_backup_is_created_with_checksum_and_verifies(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/backups/platform')->assertRedirect();

        $backup = Backup::query()->firstOrFail();
        $this->assertSame('platform', $backup->scope->value);
        $this->assertNotNull($backup->checksum);
        $this->assertTrue(Storage::disk('local')->exists($backup->path));
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.backup_created']);

        $result = app(BackupService::class)->verify($backup);
        $this->assertTrue($result['ok']);
        $this->assertSame('ok', $backup->fresh()->verification_result);
    }

    public function test_tampered_artifact_fails_verification(): void
    {
        $backup = app(BackupService::class)->createPlatform($this->admin());
        Storage::disk('local')->put($backup->path, 'corrupted contents');

        $result = app(BackupService::class)->verify($backup);

        $this->assertFalse($result['ok']);
        $this->assertSame('failed', $backup->fresh()->verification_result);
    }

    public function test_tenant_backup_contains_only_that_tenants_rows(): void
    {
        $admin = $this->admin();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $userA = User::factory()->forTenant($tenantA)->create();
        $userB = User::factory()->forTenant($tenantB)->create();

        $backup = app(BackupService::class)->createTenant($tenantA, $admin);
        $data = app(BackupService::class)->read($backup);

        $emails = array_column($data['tables']['users'] ?? [], 'email');
        $this->assertContains($userA->email, $emails);
        $this->assertNotContains($userB->email, $emails);

        $this->assertCount(1, $data['tables']['tenants']);
        $this->assertSame($tenantA->getKey(), (int) $data['tables']['tenants'][0]['id']);
    }

    public function test_restore_requires_a_verified_backup_and_typed_confirmation(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();
        User::factory()->forTenant($tenant)->create();

        $backup = app(BackupService::class)->createTenant($tenant, $admin);

        // Unverified backup is rejected.
        $this->actingAs($admin)->post('/platform/restores', [
            'backup_id' => $backup->getKey(),
            'reason' => 'Recover deleted records',
        ])->assertSessionHasErrors('backup');

        app(BackupService::class)->verify($backup);

        $this->actingAs($admin)->post('/platform/restores', [
            'backup_id' => $backup->getKey(),
            'reason' => 'Recover deleted records',
        ])->assertRedirect();

        $restore = BackupRestore::query()->firstOrFail();

        // Wrong confirmation is rejected.
        $this->actingAs($admin)->post("/platform/restores/{$restore->id}/execute", ['confirm' => 'wrong'])
            ->assertStatus(422);
        $this->assertSame('approved', $restore->fresh()->status->value);

        $this->actingAs($admin)->post("/platform/restores/{$restore->id}/execute", ['confirm' => $tenant->slug])
            ->assertRedirect();
        $this->assertSame('completed', $restore->fresh()->status->value);
    }

    public function test_restore_replaces_tenant_rows_and_leaves_other_tenants_intact(): void
    {
        $admin = $this->admin();
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $keptUser = User::factory()->forTenant($tenantA)->create();
        $otherUser = User::factory()->forTenant($tenantB)->create();

        $backup = app(BackupService::class)->createTenant($tenantA, $admin);
        app(BackupService::class)->verify($backup);

        // A user created after the snapshot should be removed by the restore.
        $removedUser = User::factory()->forTenant($tenantA)->create();

        $restore = app(RestoreService::class)->request($backup, $tenantA, 'Disaster recovery drill', $admin);
        $verification = app(RestoreService::class)->execute($restore, $admin);

        $this->assertTrue($verification['ok']);
        $this->assertDatabaseMissing('users', ['email' => $removedUser->email]);
        $this->assertDatabaseHas('users', ['email' => $keptUser->email]);
        $this->assertDatabaseHas('users', ['email' => $otherUser->email]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.restore_completed']);
    }

    public function test_prune_removes_expired_backups_and_their_artifacts(): void
    {
        $backup = app(BackupService::class)->createPlatform($this->admin());
        $backup->forceFill(['expires_at' => now()->subDay()])->save();

        $count = app(BackupService::class)->prune();

        $this->assertSame(1, $count);
        $this->assertDatabaseMissing('backups', ['id' => $backup->getKey()]);
        $this->assertFalse(Storage::disk('local')->exists($backup->path));
    }

    public function test_backup_permissions_are_enforced(): void
    {
        $platformAdmin = User::factory()->platformAdmin()->create();
        $platformAdmin->assignRole(RoleName::PlatformAdmin);

        // Platform admin can view and create, but not restore.
        $this->actingAs($platformAdmin)->get('/platform/backups')->assertOk();
        $this->actingAs($platformAdmin)->post('/platform/backups/platform')->assertRedirect();
        $this->actingAs($platformAdmin)->post('/platform/restores', ['backup_id' => 1, 'reason' => 'x'])->assertForbidden();

        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::PlatformAuditor);
        $this->actingAs($auditor)->get('/platform/backups')->assertForbidden();
        $this->actingAs($auditor)->get('/platform/restores')->assertForbidden();
    }
}
