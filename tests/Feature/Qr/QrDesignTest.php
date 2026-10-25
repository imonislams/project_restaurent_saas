<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\QrBrandingSettings;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tables\Models\QrCardDesign;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\QrCardDesignService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The QR design panel: editable card designs (per branch, with a company-wide
 * fallback), the rendered preview/PDF, and the customer QR menu branding.
 */
class QrDesignTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function table(array $attributes = []): Table
    {
        return Table::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
        ], $attributes));
    }

    protected function service(): QrCardDesignService
    {
        return app(QrCardDesignService::class);
    }

    public function test_the_designer_page_loads_with_a_default_design(): void
    {
        $this->actingAs($this->user)
            ->get('/qr-dining/designs?branch_id='.$this->branch->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('QrDining/Designer')
                ->has('designs', 1)
                ->where('restaurant_name', $this->tenant->name)
                ->where('filters.branch_id', $this->branch->id));
    }

    public function test_a_new_design_becomes_active_and_deactivates_its_sibling(): void
    {
        $this->actingAs($this->user)
            ->post('/qr-dining/designs', ['name' => 'Tent', 'branch_id' => $this->branch->id])
            ->assertRedirect();

        $first = QrCardDesign::query()->where('name', 'Tent')->firstOrFail();

        $this->actingAs($this->user)
            ->post('/qr-dining/designs', ['name' => 'Counter card', 'branch_id' => $this->branch->id])
            ->assertRedirect();

        $second = QrCardDesign::query()->where('name', 'Counter card')->firstOrFail();

        $this->assertTrue($second->fresh()->is_active);
        $this->assertFalse($first->fresh()->is_active);
    }

    public function test_the_active_design_prefers_the_branch_and_falls_back_to_company_wide(): void
    {
        $service = $this->service();

        $company = $service->create($this->tenant, null, 'Company card', null, $this->user, true);
        $this->assertTrue($service->activeFor($this->tenant, $this->branch)->is($company));

        $branchDesign = $service->create($this->tenant, $this->branch->getKey(), 'Branch card', null, $this->user, true);
        $this->assertTrue($service->activeFor($this->tenant, $this->branch)->is($branchDesign));

        // A branch with no design of its own still prints the company-wide card.
        $other = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'BR2']);
        $this->assertTrue($service->activeFor($this->tenant, $other)->is($company));
    }

    public function test_a_branch_design_list_includes_the_company_wide_design(): void
    {
        $service = $this->service();
        $service->create($this->tenant, null, 'Company card', null, $this->user, true);
        $service->create($this->tenant, $this->branch->getKey(), 'Branch card', null, $this->user, true);
        $service->create($this->tenant, Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'BR2'])->getKey(), 'Other branch card', null, $this->user, true);

        $this->assertSame(2, $service->list($this->tenant, $this->branch->getKey())->count());
        $this->assertSame(3, $service->list($this->tenant)->count());
    }

    public function test_the_canvas_is_normalised_before_it_is_stored(): void
    {
        $this->actingAs($this->user)->post('/qr-dining/designs', [
            'name' => 'Tent',
            'branch_id' => $this->branch->id,
            'canvas' => [
                'width_mm' => 100,
                'height_mm' => 150,
                'background' => 'not-a-colour',
                'elements' => [
                    ['id' => 'a', 'type' => 'script', 'x' => 0, 'y' => 0, 'w' => 10, 'h' => 10, 'props' => ['content' => '<script>']],
                    ['id' => 'b', 'type' => 'text', 'x' => -50, 'y' => 0, 'w' => 10, 'h' => 10, 'props' => ['content' => 'Hello', 'color' => 'red']],
                ],
            ],
        ])->assertRedirect();

        $design = QrCardDesign::query()->where('name', 'Tent')->firstOrFail();
        $canvas = $design->canvas;

        // The unsupported element type is dropped and the fallbacks are applied.
        $this->assertSame('#ffffff', $canvas['background']);
        $this->assertCount(1, $canvas['elements']);
        $this->assertSame('text', $canvas['elements'][0]['type']);
        $this->assertSame(0.0, (float) $canvas['elements'][0]['x']);
        $this->assertSame('#0f172a', $canvas['elements'][0]['props']['color']);
    }

    public function test_the_preview_renders_the_card_with_the_table_name(): void
    {
        $table = $this->table(['name' => 'Table 7']);
        $design = $this->service()->create($this->tenant, $this->branch->getKey(), 'Tent', null, $this->user, true);

        $this->actingAs($this->user)
            ->get("/qr-dining/designs/{$design->id}/preview?table_id={$table->id}")
            ->assertOk()
            ->assertSee('Table 7')
            ->assertSee($this->tenant->name);
    }

    public function test_the_export_returns_a_pdf_for_the_branch_tables(): void
    {
        $this->table();
        $design = $this->service()->create($this->tenant, $this->branch->getKey(), 'Tent', null, $this->user, true);

        $response = $this->actingAs($this->user)->get("/qr-dining/designs/{$design->id}/export");

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
    }

    public function test_branding_is_saved_per_branch_and_falls_back_to_the_defaults(): void
    {
        $branding = app(QrBrandingSettings::class);

        $this->actingAs($this->user)->post('/qr-dining/branding', [
            'branch_id' => $this->branch->id,
            'primary_color' => '#123456',
            'header_style' => 'brand',
            'welcome_title' => 'Welcome!',
        ])->assertRedirect();

        $resolved = $branding->resolve($this->tenant, $this->branch->fresh());

        $this->assertSame('#123456', $resolved['primary_color']);
        $this->assertSame('Welcome!', $resolved['welcome_title']);
        $this->assertSame('brand', $resolved['header_style']);
        // A dark primary colour gets readable white text.
        $this->assertSame('#ffffff', $resolved['primary_text']);

        // An untouched branch keeps the built-in branding.
        $other = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'BR2']);
        $this->assertSame('#ec3013', $branding->resolve($this->tenant, $other)['primary_color']);
    }

    public function test_a_design_from_another_tenant_is_not_visible(): void
    {
        $design = $this->service()->create($this->tenant, $this->branch->getKey(), 'Tent', null, $this->user, true);

        app(TenantContext::class)->set(Tenant::factory()->create());

        $this->assertSame(0, QrCardDesign::query()->whereKey($design->getKey())->count());
    }

    public function test_a_user_without_the_manage_permission_cannot_create_a_design(): void
    {
        $nobody = User::factory()->forTenant($this->tenant)->create();

        $this->actingAs($nobody)
            ->post('/qr-dining/designs', ['name' => 'Nope'])
            ->assertForbidden();
    }
}
