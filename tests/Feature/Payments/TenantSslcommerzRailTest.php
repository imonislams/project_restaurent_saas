<?php

namespace Tests\Feature\Payments;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Orders\Models\Order;
use App\Domain\PaymentGateways\Drivers\SslCommerzDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\Payment;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The tenant (restaurant) SSLCommerz rail: the diner pays through the tenant's own
 * gateway, and the payment is settled by the provider callback / return.
 */
class TenantSslcommerzRailTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $owner;

    protected Branch $branch;

    protected Table $table;

    protected string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->getKey(), 'code' => 'MAIN']);
        $this->table = Table::factory()->create(['tenant_id' => $this->tenant->getKey(), 'branch_id' => $this->branch->getKey()]);

        app(TenantContext::class)->set($this->tenant);
        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;

        TenantGateway::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->getKey(),
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'is_default' => true,
            'supported_currencies' => ['BDT'],
            'credentials' => ['store_id' => 'store', 'store_password' => 'pass'],
        ]);
    }

    protected function gateway(): TenantGateway
    {
        return TenantGateway::withoutGlobalScopes()->where('provider', 'sslcommerz')->firstOrFail();
    }

    protected function order(bool $withSession = false): Order
    {
        $session = $withSession
            ? DiningSession::factory()->create([
                'tenant_id' => $this->tenant->getKey(),
                'branch_id' => $this->branch->getKey(),
                'table_id' => $this->table->getKey(),
            ])
            : null;

        return Order::create([
            'tenant_id' => $this->tenant->getKey(),
            'branch_id' => $this->branch->getKey(),
            'user_id' => $this->owner->getKey(),
            'dining_session_id' => $session?->getKey(),
            'order_number' => 'ORD-'.uniqid(),
            'status' => 'held',
            'currency' => 'BDT',
            'total' => 100,
            'placed_at' => now(),
        ]);
    }

    protected function pendingPayment(Order $order, string $reference): Payment
    {
        return $order->payments()->create([
            'tenant_id' => $this->tenant->getKey(),
            'amount' => 100,
            'status' => PaymentStatus::Pending->value,
            'reference' => $reference,
        ]);
    }

    public function test_the_checkout_builds_the_payload_sslcommerz_requires(): void
    {
        Http::fake(['sandbox.sslcommerz.com/gwprocess/*' => Http::response(['GatewayPageURL' => 'https://sandbox.sslcommerz.com/pay/x'], 200)]);

        $result = (new SslCommerzDriver)->createCheckout($this->gateway(), [
            'amount' => 250,
            'currency' => 'BDT',
            'reference' => 'ORD-1',
            'description' => 'Order ORD-1',
        ]);

        $this->assertSame('pending', $result['status']);
        $this->assertSame('https://sandbox.sslcommerz.com/pay/x', $result['redirect_url']);
        $this->assertStringStartsWith('ORD-1-', (string) $result['reference']);

        Http::assertSent(function ($request) use ($result) {
            $data = $request->data();

            return str_contains($request->url(), 'gwprocess/v4/api.php')
                && $data['total_amount'] === '250.00'
                && $data['currency'] === 'BDT'
                && $data['tran_id'] === $result['reference']
                && $data['store_id'] === 'store'
                && $data['product_profile'] === 'physical-goods'
                && $data['success_url'] === route('payments.tenant-return', ['provider' => 'sslcommerz', 'result' => 'success'])
                && $data['ipn_url'] === route('webhooks.payments', ['provider' => 'sslcommerz']);
        });
    }

    public function test_a_form_posted_ipn_settles_the_payment_after_verification(): void
    {
        $payment = $this->pendingPayment($this->order(), 'ORD-1-ABC123');

        Http::fake(['sandbox.sslcommerz.com/validator/api/*' => Http::response([
            'status' => 'VALID',
            'amount' => '100.00',
            'currency' => 'BDT',
            'tran_id' => 'ORD-1-ABC123',
        ], 200)]);

        $this->post('/webhooks/payments/sslcommerz', [
            'tran_id' => 'ORD-1-ABC123',
            'val_id' => 'VAL-1',
            'status' => 'VALID',
        ])->assertOk()->assertJson(['received' => true]);

        $this->assertSame(PaymentStatus::Succeeded, $payment->fresh()->status);
    }

    public function test_the_return_endpoint_settles_and_forwards_to_the_tracking_page(): void
    {
        $payment = $this->pendingPayment($this->order(withSession: true), 'ORD-2-XYZ789');

        Http::fake(['sandbox.sslcommerz.com/validator/api/*' => Http::response([
            'status' => 'VALIDATED',
            'amount' => '100.00',
            'currency' => 'BDT',
            'tran_id' => 'ORD-2-XYZ789',
        ], 200)]);

        $this->post(route('payments.tenant-return', ['provider' => 'sslcommerz', 'result' => 'success']), [
            'tran_id' => 'ORD-2-XYZ789',
            'val_id' => 'VAL-2',
            'status' => 'VALID',
        ])->assertRedirect(route('qr.tracking', ['token' => $this->token]));

        $this->assertSame(PaymentStatus::Succeeded, $payment->fresh()->status);
    }

    public function test_an_unverified_callback_does_not_settle_the_payment(): void
    {
        $payment = $this->pendingPayment($this->order(), 'ORD-3-NOPE');

        Http::fake(['sandbox.sslcommerz.com/validator/api/*' => Http::response([
            'status' => 'INVALID_TRANSACTION',
            'tran_id' => 'ORD-3-NOPE',
        ], 200)]);

        $this->post('/webhooks/payments/sslcommerz', [
            'tran_id' => 'ORD-3-NOPE',
            'val_id' => 'BAD',
            'status' => 'VALID',
        ])->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
    }
}
