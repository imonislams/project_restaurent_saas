<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Enums\OrderType;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrSettingsAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected Table $table;

    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;
    }

    public function test_qr_settings_persist_from_the_settings_hub(): void
    {
        $this->actingAs($this->user)->post('/settings/qr', [
            'qr_enabled' => true,
            'qr_guest_checkout' => true,
            'qr_require_phone' => true,
            'qr_require_email' => false,
            'qr_session_timeout_minutes' => 240,
            'qr_auto_accept' => false,
            'qr_allow_additional_orders' => true,
            'qr_allow_notes' => false,
            'qr_live_tracking' => true,
            'qr_allow_bill_request' => true,
            'qr_billing_mode' => 'individual',
            'qr_digital_receipt' => true,
            'qr_feedback' => false,
            'qr_loyalty' => true,
        ])->assertRedirect();

        $this->tenant->refresh();
        $this->assertFalse((bool) $this->tenant->getSetting('qr.auto_accept'));
        $this->assertTrue((bool) $this->tenant->getSetting('qr.require_phone'));
        $this->assertSame('individual', $this->tenant->getSetting('qr.billing_mode'));
        $this->assertSame(240, (int) $this->tenant->getSetting('qr.session_timeout_minutes'));
    }

    public function test_the_qr_settings_tab_renders(): void
    {
        $this->actingAs($this->user)
            ->get('/settings/qr')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Settings/Show')->where('group', 'qr'));
    }

    public function test_auto_accept_setting_is_enforced_on_order_placement(): void
    {
        $this->tenant->mergeSettings(['qr.auto_accept' => false]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();

        $this->withHeader('X-Dining-Token', $start->json('session_token'))
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'acc-1',
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $start->json('participant_token')])
            ->assertCreated()
            ->assertJsonPath('order.acceptance_status', 'pending');
    }

    public function test_the_analytics_page_computes_qr_metrics(): void
    {
        $session = DiningSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'table_id' => $this->table->id,
        ]);

        Order::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'table_id' => $this->table->id,
            'dining_session_id' => $session->id,
            'user_id' => null,
            'order_number' => 'MAIN-1',
            'order_type' => OrderType::DineIn,
            'source' => OrderSource::Qr,
            'status' => OrderStatus::Completed,
            'acceptance_status' => AcceptanceStatus::AutoAccepted,
            'subtotal' => 120,
            'total' => 120,
            'paid_total' => 120,
            'currency' => 'USD',
            'placed_at' => now(),
        ]);

        $this->actingAs($this->user)
            ->get('/qr-dining/analytics')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('QrDining/Analytics')
                ->where('analytics.summary.1.value', 1)
                ->where('analytics.summary.2.value', 120));
    }

    public function test_tracking_lists_session_orders_and_polls_status(): void
    {
        Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100, 'inventory_mode' => InventoryMode::None]);

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $sessionToken = $start->json('session_token');
        $participant = $start->json('participant_token');

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'track-1',
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $participant])->assertCreated();

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->get("/qr/{$this->token}/tracking")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Qr/Tracking')->has('initial.orders', 1));

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->getJson("/qr/{$this->token}/status", ['X-Dining-Participant' => $participant])
            ->assertOk()
            ->assertJsonCount(1, 'orders');
    }

    public function test_individual_billing_hides_other_participants_orders(): void
    {
        $this->tenant->mergeSettings(['qr.billing_mode' => 'individual']);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100, 'inventory_mode' => InventoryMode::None]);

        $a = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $this->withHeader('X-Dining-Token', $a->json('session_token'))
            ->postJson("/qr/{$this->token}/orders", ['idempotency_key' => 'a', 'items' => [['product_id' => $product->id, 'quantity' => 1]]], ['X-Dining-Participant' => $a->json('participant_token')])
            ->assertCreated();

        $b = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $this->withHeader('X-Dining-Token', $b->json('session_token'))
            ->postJson("/qr/{$this->token}/orders", ['idempotency_key' => 'b', 'items' => [['product_id' => $product->id, 'quantity' => 1]]], ['X-Dining-Participant' => $b->json('participant_token')])
            ->assertCreated();

        // Participant A sees only their own order under individual billing.
        $this->withHeader('X-Dining-Token', $a->json('session_token'))
            ->getJson("/qr/{$this->token}/status", ['X-Dining-Participant' => $a->json('participant_token')])
            ->assertOk()
            ->assertJsonCount(1, 'orders');
    }
}
