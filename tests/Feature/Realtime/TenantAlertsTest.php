<?php

namespace Tests\Feature\Realtime;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\QrPaymentService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Realtime\Events\QrSessionUpdated;
use App\Domain\Realtime\Events\TenantAlert;
use App\Domain\Realtime\RealtimeManager;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TenantAlertsTest extends TestCase
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
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false], 'inventory' => ['low_stock_threshold' => 5]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);

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

    protected function enableRealtime(): void
    {
        $realtime = app(RealtimeManager::class);
        $realtime->setDriver('pusher');
        $realtime->setCredentials('pusher', ['app_id' => '1', 'key' => 'k', 'secret' => 's', 'cluster' => 'ap2']);
    }

    protected function placeQrOrder(): Order
    {
        Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100, 'inventory_mode' => InventoryMode::None]);

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();

        $this->withHeader('X-Dining-Token', $start->json('session_token'))
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'rt4-'.uniqid(),
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $start->json('participant_token')])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_crossing_the_low_stock_threshold_is_pushed_to_the_inventory_area(): void
    {
        $this->enableRealtime();
        Event::fake([TenantAlert::class]);

        $ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Mozzarella']);
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        $stock = app(\App\Domain\Inventory\StockService::class);

        $stock->record($ingredient, $location, 10, StockMovementReason::Opening);
        $stock->record($ingredient, $location, -6, StockMovementReason::Sale);

        Event::assertDispatched(TenantAlert::class, function (TenantAlert $event) {
            return $event->area === 'inventory'
                && str_contains($event->title, 'Low stock')
                && str_contains($event->body, 'Mozzarella')
                && str_contains((string) $event->broadcastOn()[0], 'tenant.'.$this->tenant->getKey().'.inventory');
        });
    }

    public function test_stock_that_stays_above_the_threshold_is_not_pushed(): void
    {
        $this->enableRealtime();
        Event::fake([TenantAlert::class]);

        $ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id]);
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        $stock = app(\App\Domain\Inventory\StockService::class);

        $stock->record($ingredient, $location, 20, StockMovementReason::Opening);
        $stock->record($ingredient, $location, -6, StockMovementReason::Sale);

        Event::assertNotDispatched(TenantAlert::class);
    }

    public function test_an_online_payment_is_pushed_to_the_billing_area(): void
    {
        $this->enableRealtime();
        Event::fake([TenantAlert::class, QrSessionUpdated::class]);

        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->getKey(),
            'order_number' => 'ORD-PAY-1',
            'status' => 'held',
            'total' => 100,
            'currency' => 'BDT',
            'placed_at' => now(),
        ]);

        $order->payments()->create([
            'tenant_id' => $this->tenant->id,
            'amount' => 100,
            'status' => PaymentStatus::Succeeded->value,
            'reference' => 'PAY-1',
        ]);

        app(QrPaymentService::class)->reconcile($order);

        Event::assertDispatched(TenantAlert::class, fn (TenantAlert $event) => $event->area === 'billing'
            && str_contains($event->title, 'Online payment received')
            && str_contains((string) $event->broadcastOn()[0], 'tenant.'.$this->tenant->getKey().'.billing'));

        // No dining session on this order, so the diner channel is not touched.
        Event::assertNotDispatched(QrSessionUpdated::class);
    }

    public function test_accepting_a_qr_order_refreshes_the_diners_tracking_page(): void
    {
        $this->enableRealtime();
        $order = $this->placeQrOrder();

        Event::fake([QrSessionUpdated::class]);

        $this->actingAs($this->user)->post("/orders/{$order->id}/accept")->assertRedirect();

        Event::assertDispatched(QrSessionUpdated::class, fn (QrSessionUpdated $event) => $event->token === $this->token
            && $event->reason === 'accepted'
            && (string) $event->broadcastOn()[0] === 'qr.'.$this->token);
    }

    public function test_the_billing_stream_gate_silences_these_alerts(): void
    {
        $this->enableRealtime();
        app(RealtimeManager::class)->setStream('billing', false);

        Event::fake([TenantAlert::class]);

        $ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id]);
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        $stock = app(\App\Domain\Inventory\StockService::class);

        $stock->record($ingredient, $location, 10, StockMovementReason::Opening);
        $stock->record($ingredient, $location, -6, StockMovementReason::Sale);

        Event::assertNotDispatched(TenantAlert::class);
    }
}
