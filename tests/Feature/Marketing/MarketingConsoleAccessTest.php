<?php

namespace Tests\Feature\Marketing;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Access control for the Marketing & Growth workspace.
 *
 * The workspace is platform-level only: no tenant may reach any of it, and a
 * platform admin without the specific permission gets no data.
 */
class MarketingConsoleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function admin(RoleName $role): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole($role);

        return $admin;
    }

    protected function tenantOwner(): User
    {
        $owner = User::factory()->forTenant(Tenant::factory()->create())->create();
        $owner->assignRole(RoleName::TenantOwner);

        return $owner;
    }

    public function test_dashboard_renders_for_a_super_admin(): void
    {
        $this->actingAs($this->admin(RoleName::SaasSuperAdmin))
            ->get('/platform/marketing')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Marketing/Dashboard')
                ->has('blocks')
                ->has('trend')
                ->has('tracking')
                ->has('methodology')
            );
    }

    public function test_a_tenant_user_is_forbidden_on_every_marketing_route(): void
    {
        $owner = $this->tenantOwner();

        foreach ([
            '/platform/marketing',
            '/platform/marketing/automation/campaigns',
            '/platform/marketing/announcements',
            '/platform/marketing/campaigns',
        ] as $uri) {
            $this->actingAs($owner)->get($uri)->assertForbidden();
        }
    }

    public function test_a_platform_admin_without_any_role_has_no_marketing_access(): void
    {
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)->get('/platform/marketing')->assertForbidden();
    }

    public function test_view_permission_is_separate_from_manage_permission(): void
    {
        // The auditor role may read the workspace but not change anything in it.
        $auditor = $this->admin(RoleName::PlatformAuditor);

        $this->actingAs($auditor)->get('/platform/marketing')->assertOk();
        $this->actingAs($auditor)->get('/platform/marketing/automation/campaigns')->assertForbidden();
    }

    public function test_a_role_without_the_view_permission_is_refused(): void
    {
        // The support operator role holds no marketing permission.
        $this->actingAs($this->admin(RoleName::SupportOperator))
            ->get('/platform/marketing')
            ->assertForbidden();
    }

    public function test_the_denied_response_carries_no_marketing_payload(): void
    {
        $response = $this->actingAs($this->tenantOwner())->get('/platform/marketing');

        $response->assertForbidden();
        $this->assertStringNotContainsString('Marketing Dashboard', $response->getContent());
        $this->assertStringNotContainsString('methodology', $response->getContent());
    }

    public function test_the_campaigns_path_now_serves_real_campaigns(): void
    {
        // Email campaigns moved to /marketing/automation/campaigns, so this path is
        // the marketing campaigns list rather than the temporary redirect it held.
        $this->actingAs($this->admin(RoleName::SaasSuperAdmin))
            ->get('/platform/marketing/campaigns')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Marketing/Campaigns/Index'));
    }

    public function test_period_presets_are_honoured_by_the_dashboard(): void
    {
        $admin = $this->admin(RoleName::SaasSuperAdmin);

        $this->actingAs($admin)
            ->get('/platform/marketing?preset=yesterday')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('period.preset', 'yesterday'));

        $this->actingAs($admin)
            ->get('/platform/marketing?preset=90d')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('period.preset', '90d'));

        // An unknown preset falls back to the default rather than erroring.
        $this->actingAs($admin)
            ->get('/platform/marketing?preset=not-a-preset')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('period.preset', '30d'));
    }

    public function test_the_dashboard_reports_metrics_it_cannot_compute_instead_of_faking_them(): void
    {
        $this->actingAs($this->admin(RoleName::SaasSuperAdmin))
            ->get('/platform/marketing')
            ->assertOk()
            ->assertInertia(function ($page) {
                $blocks = collect($page->toArray()['props']['blocks'])->keyBy('key');

                // Nothing has been tracked, so the visitor figure is a real zero.
                $website = collect($blocks['website']['items'])->keyBy('key');
                $this->assertTrue($website['page_views']['available']);
                $this->assertSame(0, $website['page_views']['value']);

                // Spend has no source at all, so it must carry a reason instead of a number.
                $marketing = collect($blocks['marketing']['items'])->keyBy('key');
                $this->assertFalse($marketing['spend']['available']);
                $this->assertNull($marketing['spend']['value']);
                $this->assertNotEmpty($marketing['spend']['reason']);
            });
    }

    public function test_money_metrics_are_always_labelled_with_a_currency(): void
    {
        $this->actingAs($this->admin(RoleName::SaasSuperAdmin))
            ->get('/platform/marketing')
            ->assertOk()
            ->assertInertia(function ($page) {
                foreach ($page->toArray()['props']['blocks'] as $block) {
                    foreach ($block['items'] as $item) {
                        if ($item['format'] === 'money' && $item['available']) {
                            $this->assertNotNull($item['currency'], $item['key'].' is money without a currency.');
                        }
                    }
                }
            });
    }
}
