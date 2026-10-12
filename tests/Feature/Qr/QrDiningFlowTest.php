<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\Models\DiningSession as SessionModel;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\QrCodeRenderer;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrDiningFlowTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

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

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;
    }

    protected function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'name' => 'Burger',
            'price_dine_in' => 100,
            'price_takeaway' => 100,
            'price_delivery' => 100,
            'inventory_mode' => InventoryMode::None,
        ], $attributes));
    }

    protected function startSession(array $payload = []): array
    {
        $response = $this->postJson("/qr/{$this->token}/session", $payload)->assertOk();

        return [$response->json('session_token'), $response->json('participant_token')];
    }

    public function test_the_entry_page_renders_publicly(): void
    {
        $this->get("/qr/{$this->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Qr/Entry')
                ->where('table.name', 'T1')
                ->where('enabled', true));
    }

    public function test_starting_a_session_creates_one_session_and_a_participant(): void
    {
        [$sessionToken] = $this->startSession(['name' => 'Alex']);

        $this->assertNotEmpty($sessionToken);
        $this->assertSame(1, DiningSession::count());
        $this->assertSame(1, DiningSession::first()->participants()->count());
    }

    public function test_scanning_again_joins_the_same_session(): void
    {
        $this->startSession();
        $this->startSession();

        $this->assertSame(1, DiningSession::count());
        $this->assertSame(2, DiningSession::first()->participants()->count());
    }

    public function test_the_menu_requires_an_active_session(): void
    {
        $this->get("/qr/{$this->token}/menu")->assertRedirect("/qr/{$this->token}");
    }

    public function test_the_menu_renders_with_a_session_cookie(): void
    {
        [$sessionToken] = $this->startSession();
        $this->product(['name' => 'Pizza']);

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->get("/qr/{$this->token}/menu")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Qr/Menu')
                ->has('products', 1)
                ->where('products.0.name', 'Pizza'));
    }

    public function test_required_phone_is_enforced_when_configured(): void
    {
        $this->tenant->mergeSettings(['qr' => ['require_phone' => true]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->postJson("/qr/{$this->token}/session", [])->assertStatus(422)->assertJsonValidationErrors('phone');
    }

    public function test_a_guest_can_place_an_order_into_the_dining_session(): void
    {
        [$sessionToken, $participant] = $this->startSession();
        $product = $this->product(['price_dine_in' => 150]);

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'qr-order-1',
                'items' => [['product_id' => $product->id, 'quantity' => 2]],
            ], ['X-Dining-Participant' => $participant])
            ->assertCreated()
            ->assertJsonPath('order.status', 'held');

        $order = Order::firstOrFail();
        $this->assertSame('qr', $order->source->value);
        $this->assertNotNull($order->dining_session_id);
        $this->assertSame($participant, $order->participant->participant_token);
        $this->assertSame(300.0, (float) $order->total);
        $this->assertNull($order->user_id);
    }

    public function test_client_prices_are_ignored_and_the_server_total_wins(): void
    {
        [$sessionToken, $participant] = $this->startSession();
        $product = $this->product(['price_dine_in' => 100]);

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'qr-order-price',
                'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 1]],
            ], ['X-Dining-Participant' => $participant])
            ->assertCreated();

        $this->assertSame(100.0, (float) Order::firstOrFail()->total);
    }

    public function test_repeated_submissions_with_the_same_key_do_not_duplicate(): void
    {
        [$sessionToken, $participant] = $this->startSession();
        $product = $this->product();

        $payload = [
            'idempotency_key' => 'qr-order-dup',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ];

        $this->withHeader('X-Dining-Token', $sessionToken)->postJson("/qr/{$this->token}/orders", $payload, ['X-Dining-Participant' => $participant])->assertCreated();
        $this->withHeader('X-Dining-Token', $sessionToken)->postJson("/qr/{$this->token}/orders", $payload, ['X-Dining-Participant' => $participant])->assertCreated();

        $this->assertSame(1, Order::count());
    }

    public function test_an_unavailable_product_cannot_be_ordered(): void
    {
        [$sessionToken, $participant] = $this->startSession();
        $product = $this->product(['is_available' => false]);

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'qr-order-unavail',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $participant])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');

        $this->assertSame(0, Order::count());
    }

    public function test_a_closed_session_cannot_place_more_orders(): void
    {
        [$sessionToken, $participant] = $this->startSession();
        $product = $this->product();

        $session = SessionModel::firstOrFail();
        app(\App\Domain\Dining\DiningSessionService::class)->close($session, 'settled');

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'qr-order-closed',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $participant])
            ->assertStatus(409);

        $this->assertSame(0, Order::count());
    }

    public function test_json_rendering_is_safe_for_the_qr_service(): void
    {
        // Sanity: the renderer produces a data URI used in PDFs.
        $renderer = app(QrCodeRenderer::class);
        $this->assertStringStartsWith('data:image/png;base64,', $renderer->dataUri('https://example.test/qr/abc'));
    }
}
