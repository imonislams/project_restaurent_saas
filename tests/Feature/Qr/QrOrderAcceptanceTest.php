<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\Models\DiningSession as SessionModel;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\OrderService;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrOrderAcceptanceTest extends TestCase
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
        $this->tenant->mergeSettings([
            'tax' => ['rate' => 0, 'inclusive' => false],
            'qr' => ['auto_accept' => false],
        ]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

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

    protected function placeQrOrder(Product $product, int $qty = 1): Order
    {
        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $sessionToken = $start->json('session_token');
        $participant = $start->json('participant_token');

        $this->withHeader('X-Dining-Token', $sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'acc-'.uniqid(),
                'items' => [['product_id' => $product->id, 'quantity' => $qty]],
            ], ['X-Dining-Participant' => $participant])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_orders_are_pending_confirmation_when_auto_accept_is_off(): void
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::None,
        ]);

        $order = $this->placeQrOrder($product);

        $this->assertSame('pending', $order->acceptance_status->value);
        $this->assertNull($order->accepted_at);
    }

    public function test_accepting_marks_the_order_accepted(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $order = $this->placeQrOrder($product);

        app(OrderService::class)->accept($order->fresh(), $this->user);

        $order->refresh();
        $this->assertSame('accepted', $order->acceptance_status->value);
        $this->assertNotNull($order->accepted_at);
    }

    public function test_rejecting_reverses_reserved_stock_and_frees_the_table(): void
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::Product,
        ]);
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        app(StockService::class)->receiveOpening($product, $location, 10);

        $order = $this->placeQrOrder($product, 2);

        // Stock was deducted on submission (10 - 2 = 8).
        $this->assertSame(8.0, app(StockService::class)->balanceFor($product, $location));
        $this->assertSame('occupied', $this->table->fresh()->status->value);

        app(OrderService::class)->reject($order->fresh(), $this->user, 'Out of stock');

        $order->refresh();
        $this->assertSame('rejected', $order->acceptance_status->value);
        $this->assertSame('voided', $order->status->value);
        $this->assertSame(10.0, app(StockService::class)->balanceFor($product, $location));
        $this->assertSame('available', $this->table->fresh()->status->value);
    }

    public function test_staff_can_accept_a_pending_order_over_http(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $order = $this->placeQrOrder($product);

        $this->actingAs($this->user)
            ->post("/orders/{$order->id}/accept")
            ->assertRedirect();

        $this->assertSame('accepted', $order->fresh()->acceptance_status->value);
    }

    public function test_a_pending_qr_order_is_visible_in_the_orders_list(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $this->placeQrOrder($product);

        $this->actingAs($this->user)
            ->get('/orders?source=qr')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Orders/Index')
                ->has('orders.data', 1)
                ->where('orders.data.0.source', 'qr')
                ->where('orders.data.0.acceptance_status', 'pending'));
    }
}
