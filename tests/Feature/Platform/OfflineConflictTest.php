<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\POS\Models\OfflineSyncConflict;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflineConflictTest extends TestCase
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

    /** @param array<string, mixed> $attributes */
    protected function conflict(array $attributes = []): OfflineSyncConflict
    {
        return OfflineSyncConflict::create(array_merge([
            'offline_uuid' => 'abc-123',
            'operation_type' => 'place_sale',
            'type' => OfflineSyncConflict::TYPE_TOTAL_MISMATCH,
            'status' => OfflineSyncConflict::STATUS_OPEN,
            'message' => 'The device charged 90.00 but the server priced the order at 100.00.',
            'expected' => ['total' => 90.0],
            'actual' => ['total' => 100.0],
        ], $attributes));
    }

    public function test_the_conflict_list_renders_for_a_platform_admin(): void
    {
        $this->conflict();

        $this->actingAs($this->admin())
            ->get('/platform/offline-conflicts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/OfflineConflicts')
                ->where('summary.open', 1)
                ->has('conflicts.data', 1));
    }

    public function test_the_list_defaults_to_open_conflicts(): void
    {
        $this->conflict();
        $this->conflict([
            'offline_uuid' => 'abc-456',
            'status' => OfflineSyncConflict::STATUS_RESOLVED,
            'resolved_at' => now(),
        ]);

        $this->actingAs($this->admin())
            ->get('/platform/offline-conflicts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.status', 'open')
                ->has('conflicts.data', 1)
                ->where('summary.resolved', 1));
    }

    public function test_resolving_a_conflict_records_the_reviewer_and_audits(): void
    {
        $conflict = $this->conflict();

        $this->actingAs($this->admin())
            ->post("/platform/offline-conflicts/{$conflict->id}/resolve", ['note' => 'Counted the difference.'])
            ->assertRedirect();

        $conflict->refresh();

        $this->assertSame(OfflineSyncConflict::STATUS_RESOLVED, $conflict->status);
        $this->assertNotNull($conflict->resolved_at);
        $this->assertNotNull($conflict->resolved_by);
        $this->assertSame('Counted the difference.', $conflict->resolution_note);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.offline_conflict_resolved']);
    }

    public function test_a_billing_admin_cannot_reach_the_conflict_list(): void
    {
        $billing = User::factory()->platformAdmin()->create();
        $billing->assignRole(RoleName::BillingAdmin);

        $this->actingAs($billing)->get('/platform/offline-conflicts')->assertForbidden();
    }
}
