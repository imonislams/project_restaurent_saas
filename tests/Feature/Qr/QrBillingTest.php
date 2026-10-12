<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\QrPaymentService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\Payments\WebhookService;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrBillingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected Table $table;

    protected string $token;

    protected string $sessionToken;

    protected string $participant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->user, 0);

        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $this->sessionToken = $start->json('session_token');
        $this->participant = $start->json('participant_token');
    }

    protected function withDiningSession(): self
    {
        return $this->withHeader('X-Dining-Token', $this->sessionToken);
    }

    protected function placeOrder(float $price = 100): Order
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => $price,
            'inventory_mode' => InventoryMode::None,
        ]);

        $this->withDiningSession()->postJson("/qr/{$this->token}/orders", [
            'idempotency_key' => 'bill-'.uniqid(),
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ], ['X-Dining-Participant' => $this->participant])->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_a_customer_can_request_the_bill_idempotently(): void
    {
        $this->placeOrder();

        $this->withDiningSession()->postJson("/qr/{$this->token}/bill-request", [], ['X-Dining-Participant' => $this->participant])->assertOk();
        $this->withDiningSession()->postJson("/qr/{$this->token}/bill-request", [], ['X-Dining-Participant' => $this->participant])->assertOk();

        $this->assertSame(1, DiningSession::firstOrFail()->billRequests()->count());
        $this->assertSame('bill_requested', DiningSession::firstOrFail()->status->value);
    }

    public function test_bill_requests_can_be_disabled_by_the_tenant(): void
    {
        $this->tenant->mergeSettings(['qr' => ['allow_bill_request' => false]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $this->withDiningSession()->postJson("/qr/{$this->token}/bill-request", [], ['X-Dining-Participant' => $this->participant])->assertForbidden();
    }

    public function test_settling_all_session_orders_closes_the_session(): void
    {
        $order = $this->placeOrder(120);
        $cash = PaymentMethod::query()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->user)->post("/orders/{$order->id}/settle", [
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 120, 'tendered' => 120]],
        ])->assertRedirect();

        $session = DiningSession::firstOrFail()->fresh();
        $this->assertSame('closed', $session->status->value);
        $this->assertSame('settled', $session->close_reason);
    }

    public function test_a_closed_session_shows_the_thank_you_receipt(): void
    {
        $order = $this->placeOrder(90);
        $cash = PaymentMethod::query()->where('code', 'cash')->firstOrFail();
        $this->actingAs($this->user)->post("/orders/{$order->id}/settle", [
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 90, 'tendered' => 90]],
        ])->assertRedirect();

        $this->withDiningSession()
            ->get("/qr/{$this->token}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Qr/Closed')
                ->where('receipt.settled', true)
                ->where('receipt.total', 90));
    }

    public function test_feedback_is_stored_after_the_session(): void
    {
        $this->withDiningSession()->postJson("/qr/{$this->token}/feedback", [
            'rating' => 5,
            'comment' => 'Great food',
        ], ['X-Dining-Participant' => $this->participant])->assertOk();

        $this->assertDatabaseHas('dining_feedback', ['rating' => 5, 'comment' => 'Great food']);
    }

    public function test_an_online_payment_via_the_manual_gateway_settles_and_closes(): void
    {
        $order = $this->placeOrder(100);

        $this->withDiningSession()->postJson("/qr/{$this->token}/payment", [
            'order_id' => $order->id,
            'idempotency_key' => 'pay-1',
        ], ['X-Dining-Participant' => $this->participant])->assertOk();

        $order->refresh();
        $this->assertSame('completed', $order->status->value);
        $this->assertSame(100.0, (float) $order->paid_total);
        $this->assertSame('closed', DiningSession::firstOrFail()->status->value);
    }

    public function test_a_pending_gateway_payment_does_not_settle_until_verified(): void
    {
        $this->tenant->mergeSettings(['payments' => ['provider' => 'stub']]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $order = $this->placeOrder(100);

        $response = $this->withDiningSession()->postJson("/qr/{$this->token}/payment", [
            'order_id' => $order->id,
            'idempotency_key' => 'pay-stub-1',
        ], ['X-Dining-Participant' => $this->participant])->assertOk();

        $this->assertSame('pending', $response->json('payment.status'));
        $this->assertSame('held', $order->fresh()->status->value);
        $this->assertSame('open', DiningSession::firstOrFail()->status->value);

        // Confirming webhook flips the payment; reconcile then finalizes it.
        $reference = $response->json('payment.reference');
        $this->confirmStubWebhook($reference);

        $this->assertSame(PaymentStatus::Succeeded, Payment::firstOrFail()->status);

        app(QrPaymentService::class)->reconcile($order->fresh());
        $this->assertSame('completed', $order->fresh()->status->value);
        $this->assertSame('closed', DiningSession::firstOrFail()->status->value);
    }

    public function test_duplicate_pending_payments_are_idempotent(): void
    {
        $this->tenant->mergeSettings(['payments' => ['provider' => 'stub']]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $order = $this->placeOrder(100);

        $payload = ['order_id' => $order->id, 'idempotency_key' => 'pay-dup'];

        $this->withDiningSession()->postJson("/qr/{$this->token}/payment", $payload, ['X-Dining-Participant' => $this->participant])->assertOk();
        $this->withDiningSession()->postJson("/qr/{$this->token}/payment", $payload, ['X-Dining-Participant' => $this->participant])->assertOk();

        $this->assertSame(1, Payment::count());
    }

    protected function confirmStubWebhook(?string $reference): void
    {
        config(['services.payments.stub_secret' => 'test-secret']);

        $data = ['id' => 'evt-1', 'type' => 'payment.succeeded', 'reference' => $reference, 'status' => 'succeeded'];
        $payload = json_encode($data);
        $signature = hash_hmac('sha256', $payload, 'test-secret');

        app(WebhookService::class)->handle('stub', $payload, $signature, $data);
    }
}
