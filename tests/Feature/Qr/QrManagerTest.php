<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrManagerTest extends TestCase
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
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id]);

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

    public function test_each_table_receives_a_distinct_valid_token(): void
    {
        $service = app(TableQrService::class);
        $a = $service->ensureToken($this->table(), $this->user);
        $b = $service->ensureToken($this->table(), $this->user);

        $this->assertNotSame($a->token, $b->token);
        $this->assertSame(64, strlen($a->token));
        $this->assertTrue($a->isUsable());
    }

    public function test_the_manager_page_lists_tables_with_usable_tokens(): void
    {
        $this->table(['name' => 'T1']);
        $this->table(['name' => 'T2']);

        $this->actingAs($this->user)
            ->get('/qr-dining/tables')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('QrDining/Tables')
                ->has('tables', 2)
                ->where('tables.0.qr_active', true));

        $this->assertSame(2, TableQrToken::count());
    }

    public function test_regenerating_revokes_the_old_token_and_issues_a_new_one(): void
    {
        $table = $this->table();
        $original = app(TableQrService::class)->ensureToken($table, $this->user);

        $this->actingAs($this->user)
            ->post("/qr-dining/tables/{$table->id}/regenerate")
            ->assertRedirect();

        $original->refresh();
        $this->assertFalse($original->isUsable());
        $this->assertNotNull($original->revoked_at);

        $current = app(TableQrService::class)->activeToken($table);
        $this->assertNotNull($current);
        $this->assertNotSame($original->token, $current->token);
    }

    public function test_a_revoked_token_stops_resolving(): void
    {
        $table = $this->table();
        $token = app(TableQrService::class)->ensureToken($table, $this->user);

        $this->actingAs($this->user)->post("/qr-dining/tables/{$table->id}/revoke")->assertRedirect();

        $this->assertNull(app(TableQrService::class)->activeToken($table));

        \Illuminate\Support\Facades\Route::middleware(['web', 'qr.context'])->get('/__qr/{token}', fn () => response()->json(['ok' => true]));
        $this->getJson("/__qr/{$token->token}")->assertStatus(410);
    }

    public function test_the_qr_endpoint_streams_png_and_svg(): void
    {
        $table = $this->table();

        $png = $this->actingAs($this->user)->get("/qr-dining/tables/{$table->id}/qr?size=200");
        $png->assertOk();
        $this->assertStringContainsString('image/png', $png->headers->get('content-type'));
        $this->assertStringStartsWith("\x89PNG", $png->getContent());

        $svg = $this->actingAs($this->user)->get("/qr-dining/tables/{$table->id}/qr?format=svg");
        $svg->assertOk();
        $this->assertStringContainsString('image/svg+xml', $svg->headers->get('content-type'));
        $this->assertStringContainsString('<svg', $svg->getContent());
    }

    public function test_printing_returns_a_pdf(): void
    {
        $this->table();

        $response = $this->actingAs($this->user)->get('/qr-dining/tables/print');
        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
    }

    public function test_managing_a_table_from_another_tenant_is_denied(): void
    {
        $otherTenant = Tenant::factory()->create();
        $otherBranch = Branch::factory()->create(['tenant_id' => $otherTenant->id]);
        $otherTable = Table::create([
            'tenant_id' => $otherTenant->id,
            'branch_id' => $otherBranch->id,
            'name' => 'Theirs',
            'seats' => 2,
            'status' => 'available',
            'is_active' => true,
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->actingAs($this->user)
            ->post("/qr-dining/tables/{$otherTable->id}/regenerate")
            ->assertNotFound();
    }

    public function test_a_cashier_can_view_but_not_manage_qr_codes(): void
    {
        $table = $this->table();
        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/qr-dining/tables')->assertOk();
        $this->actingAs($cashier)->post("/qr-dining/tables/{$table->id}/regenerate")->assertForbidden();
    }
}
