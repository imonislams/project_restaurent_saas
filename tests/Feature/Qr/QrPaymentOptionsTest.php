<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\TableQrService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QrPaymentOptionsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

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

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->token = app(TableQrService::class)->ensureToken($this->table)->token;

        $start = $this->postJson("/qr/{$this->token}/session", [])->assertOk();
        $this->sessionToken = $start->json('session_token');
        $this->participant = $start->json('participant_token');
    }

    protected function gateway(string $provider, bool $enabled = true, bool $default = false): void
    {
        $this->tenant->paymentGateways()->create([
            'name' => ucfirst($provider),
            'provider' => $provider,
            'environment' => 'sandbox',
            'is_enabled' => $enabled,
            'is_default' => $default,
            'supported_currencies' => [],
            'credentials' => ['secret_key' => 'sk_test', 'webhook_secret' => 'whsec', 'store_id' => 'x', 'store_password' => 'y', 'app_key' => 'a', 'app_secret' => 'b', 'username' => 'u', 'password' => 'p'],
        ]);
    }

    protected function placeOrder(): Order
    {
        Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100, 'inventory_mode' => InventoryMode::None]);

        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->postJson("/qr/{$this->token}/orders", [
                'idempotency_key' => 'pay-'.uniqid(),
                'items' => [['product_id' => Product::first()->id, 'quantity' => 1]],
            ], ['X-Dining-Participant' => $this->participant])
            ->assertCreated();

        return Order::latest('id')->firstOrFail();
    }

    public function test_only_enabled_gateways_are_offered_to_the_diner(): void
    {
        $this->gateway('stripe', enabled: true, default: true);
        $this->gateway('bkash', enabled: false);

        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->getJson("/qr/{$this->token}/status", ['X-Dining-Participant' => $this->participant])
            ->assertOk()
            ->assertJsonPath('payment_options.0.provider', 'stripe')
            ->assertJsonMissing(['provider' => 'bkash'])
            ->assertJsonFragment(['provider' => 'cash', 'is_cash' => true]);
    }

    public function test_an_online_gateway_returns_a_hosted_checkout_url_and_does_not_settle(): void
    {
        $this->gateway('stripe', enabled: true, default: true);
        Http::fake(['api.stripe.com/*' => Http::response(['id' => 'cs_test_1', 'url' => 'https://checkout.stripe.test/abc'], 200)]);

        $order = $this->placeOrder();

        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->postJson("/qr/{$this->token}/payment", [
                'order_id' => $order->id,
                'provider' => 'stripe',
                'idempotency_key' => 'chk-1',
            ], ['X-Dining-Participant' => $this->participant])
            ->assertOk()
            ->assertJsonPath('payment.redirect_url', 'https://checkout.stripe.test/abc')
            ->assertJsonPath('payment.status', 'pending');

        // A hosted redirect is never proof of payment.
        $this->assertSame('held', $order->fresh()->status->value);
        $this->assertSame('pending', DB::table('payments')->value('status'));
    }

    public function test_cash_can_never_be_self_settled_by_the_diner(): void
    {
        $order = $this->placeOrder();

        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->postJson("/qr/{$this->token}/payment", [
                'order_id' => $order->id,
                'provider' => 'cash',
                'idempotency_key' => 'cash-1',
            ], ['X-Dining-Participant' => $this->participant])
            ->assertOk()
            ->assertJsonPath('payment.mode', 'counter');

        $this->assertSame(0, DB::table('payments')->count());
        $this->assertSame('held', $order->fresh()->status->value);
    }

    public function test_cash_is_not_offered_when_the_tenant_has_turned_it_off(): void
    {
        $this->tenant->mergeSettings(['payments' => ['accept_cash' => false]]);
        $this->tenant->save();

        $this->gateway('stripe', enabled: true, default: true);

        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->getJson("/qr/{$this->token}/status", ['X-Dining-Participant' => $this->participant])
            ->assertOk()
            ->assertJsonPath('payment_options.0.provider', 'stripe')
            ->assertJsonMissing(['provider' => 'cash']);
    }

    public function test_a_tenant_without_configured_gateways_offers_cash_only(): void
    {
        $this->withHeader('X-Dining-Token', $this->sessionToken)
            ->getJson("/qr/{$this->token}/status", ['X-Dining-Participant' => $this->participant])
            ->assertOk()
            ->assertJsonCount(1, 'payment_options')
            ->assertJsonPath('payment_options.0.is_cash', true);
    }
}
