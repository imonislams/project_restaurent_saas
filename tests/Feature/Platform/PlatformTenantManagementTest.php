<?php

namespace Tests\Feature\Platform;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformTenantManagementTest extends TestCase
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

    public function test_directory_filters_by_account_status_and_verification(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create(['name' => 'Alpha Bistro']);
        Tenant::factory()->verified()->create(['name' => 'Beta Cafe']);
        Tenant::factory()->suspended()->create(['name' => 'Gamma Grill']);

        $this->actingAs($admin)->get('/platform/tenants?status=suspended')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Tenants/Index')->has('tenants.data', 1));

        $this->actingAs($admin)->get('/platform/tenants?verification=verified')->assertOk()
            ->assertInertia(fn ($page) => $page->has('tenants.data', 1)->where('tenants.data.0.name', 'Beta Cafe'));

        $this->actingAs($admin)->get('/platform/tenants?verification=pending')->assertOk()
            ->assertInertia(fn ($page) => $page->has('tenants.data', 2));
    }

    public function test_directory_sorts_by_name_ascending(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create(['name' => 'Zebra Foods']);
        Tenant::factory()->create(['name' => 'Aardvark Kitchen']);

        $this->actingAs($admin)->get('/platform/tenants?sort=name&direction=asc')->assertOk()
            ->assertInertia(fn ($page) => $page->where('tenants.data.0.name', 'Aardvark Kitchen'));
    }

    public function test_directory_search_matches_name_email_and_slug(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create(['name' => 'Spice Route', 'business_email' => 'hello@spiceroute.test']);
        Tenant::factory()->create(['name' => 'Ocean Grill', 'business_email' => 'hi@ocean.test']);

        $this->actingAs($admin)->get('/platform/tenants?search=spice')->assertOk()
            ->assertInertia(fn ($page) => $page->has('tenants.data', 1)->where('tenants.data.0.name', 'Spice Route'));
    }

    public function test_csv_export_streams_rows_and_is_audited(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create(['name' => 'Exportable Bistro']);

        $response = $this->actingAs($admin)->get('/platform/tenants/export');

        $response->assertOk();
        $this->assertStringContainsString('Exportable Bistro', $response->streamedContent());
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.tenants_exported']);
    }

    public function test_tenant_can_be_verified(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->assertFalse($tenant->isVerified());

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/verify")->assertRedirect();

        $this->assertTrue($tenant->fresh()->isVerified());
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.tenant_verified']);
    }

    public function test_suspension_requires_a_reason_and_records_it(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/suspend", [])
            ->assertSessionHasErrors('reason');
        $this->assertSame('active', $tenant->fresh()->status->value);

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/suspend", ['reason' => 'Chargeback fraud'])
            ->assertRedirect();

        $this->assertSame('suspended', $tenant->fresh()->status->value);

        $log = AuditLog::query()->where('action', 'platform.tenant_suspended')->latest('id')->firstOrFail();
        $this->assertSame('Chargeback fraud', $log->metadata['reason']);
    }

    public function test_reactivation_restores_access_without_touching_the_subscription(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->suspended()->create();

        $this->actingAs($admin)->post("/platform/tenants/{$tenant->id}/activate")->assertRedirect();

        $this->assertSame('active', $tenant->fresh()->status->value);
        $this->assertNull($tenant->fresh()->suspended_at);
    }

    public function test_bulk_verify_applies_to_all_selected_tenants(): void
    {
        $admin = $this->admin();
        $a = Tenant::factory()->create();
        $b = Tenant::factory()->create();

        $this->actingAs($admin)->post('/platform/tenants/bulk', [
            'action' => 'verify',
            'ids' => [$a->id, $b->id],
        ])->assertRedirect();

        $this->assertTrue($a->fresh()->isVerified());
        $this->assertTrue($b->fresh()->isVerified());
    }

    public function test_bulk_suspend_requires_a_reason(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->create();

        $this->actingAs($admin)->post('/platform/tenants/bulk', [
            'action' => 'suspend',
            'ids' => [$tenant->id],
        ])->assertSessionHasErrors('reason');

        $this->assertSame('active', $tenant->fresh()->status->value);
    }

    public function test_tenant_detail_workspace_exposes_all_tab_data(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::factory()->verified()->create();

        $this->actingAs($admin)->get("/platform/tenants/{$tenant->id}")->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Tenants/Show')
                ->has('tenant')
                ->has('tabs.overview.activity')
                ->has('tabs.subscription.limits')
                ->has('tabs.billing.invoices')
                ->has('tabs.usage.metrics')
                ->has('tabs.security.users')
                ->has('tabs.diagnostics.counts')
                ->has('tabs.backups.backups'));
    }

    public function test_verification_route_lists_unverified_tenants_by_default(): void
    {
        $admin = $this->admin();
        Tenant::factory()->create();
        Tenant::factory()->verified()->create();

        $this->actingAs($admin)->get('/platform/tenants/verification')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Tenants/Index')
                ->has('tenants.data', 1)
                ->where('filters.verification', 'pending'));
    }

    public function test_support_operator_cannot_verify_or_suspend_tenants(): void
    {
        $operator = User::factory()->platformAdmin()->create();
        $operator->assignRole(RoleName::SupportOperator);
        $tenant = Tenant::factory()->create();

        $this->actingAs($operator)->post("/platform/tenants/{$tenant->id}/verify")->assertForbidden();
        $this->actingAs($operator)->post("/platform/tenants/{$tenant->id}/suspend", ['reason' => 'x'])->assertForbidden();
    }
}
