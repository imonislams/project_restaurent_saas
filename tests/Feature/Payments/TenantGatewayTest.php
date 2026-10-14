<?php

namespace Tests\Feature\Payments;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Orders\Models\Order;
use App\Domain\PaymentGateways\ConfiguredGateway;
use App\Domain\PaymentGateways\Drivers\SslCommerzDriver;
use App\Domain\PaymentGateways\Drivers\StripeDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\PaymentGateways\TenantGatewayManager;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\WebhookService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TenantGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(): User
    {
        $user = User::factory()->forTenant(Tenant::factory()->create())->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    public function test_owner_can_add_a_cash_gateway_and_it_becomes_default(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('settings.payments.store'), [
                'provider' => 'cash',
                'environment' => 'sandbox',
                'is_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tenant_gateways', [
            'tenant_id' => $owner->tenant_id,
            'provider' => 'cash',
            'is_default' => true,
        ]);
    }

    public function test_non_cash_gateway_requires_credentials(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('settings.payments.store'), [
                'provider' => 'sslcommerz',
                'environment' => 'sandbox',
            ])
            ->assertSessionHasErrors('credentials');
    }

    public function test_gateway_credentials_are_encrypted_at_rest(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)
            ->post(route('settings.payments.store'), [
                'provider' => 'sslcommerz',
                'environment' => 'sandbox',
                'is_enabled' => true,
                'credentials' => ['store_id' => 'store', 'store_password' => 'super-secret-value'],
            ])
            ->assertRedirect();

        $raw = (string) DB::table('tenant_gateways')->value('credentials');

        $this->assertStringNotContainsString('super-secret-value', $raw);
    }

    public function test_multiple_gateways_can_be_enabled_and_default_switched(): void
    {
        $owner = $this->owner();

        $this->actingAs($owner)->post(route('settings.payments.store'), ['provider' => 'cash', 'environment' => 'sandbox', 'is_enabled' => true]);
        $this->actingAs($owner)->post(route('settings.payments.store'), [
            'provider' => 'sslcommerz',
            'environment' => 'production',
            'is_enabled' => true,
            'credentials' => ['store_id' => 's', 'store_password' => 'p'],
        ]);

        $this->assertSame(2, TenantGateway::withoutGlobalScopes()->where('tenant_id', $owner->tenant_id)->count());

        $ssl = TenantGateway::withoutGlobalScopes()->where('provider', 'sslcommerz')->firstOrFail();
        $this->actingAs($owner)->post(route('settings.payments.default', $ssl->id))->assertRedirect();

        $this->assertTrue($ssl->fresh()->is_default);
        $this->assertSame(1, TenantGateway::withoutGlobalScopes()->where('is_default', true)->count());
    }

    public function test_a_tenant_cannot_touch_another_tenants_gateway(): void
    {
        $owner = $this->owner();
        [$other] = [User::factory()->forTenant(Tenant::factory()->create())->create()];
        $other->assignRole(RoleName::TenantOwner);

        $gateway = TenantGateway::withoutGlobalScopes()->create([
            'tenant_id' => $other->tenant_id,
            'provider' => 'cash',
            'environment' => 'sandbox',
            'is_enabled' => true,
        ]);

        $this->actingAs($owner)
            ->post(route('settings.payments.toggle', $gateway->id))
            ->assertNotFound();
    }

    public function test_manager_excludes_cash_from_online_defaults(): void
    {
        $tenant = Tenant::factory()->create();

        TenantGateway::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'provider' => 'cash',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'is_default' => true,
        ]);

        $manager = app(TenantGatewayManager::class);

        $this->assertNull($manager->defaultOnlineFor($tenant));
        $this->assertNotNull($manager->defaultFor($tenant));
    }

    public function test_stripe_webhook_signature_is_verified(): void
    {
        $config = new TenantGateway(['provider' => 'stripe', 'environment' => 'sandbox', 'credentials' => ['webhook_secret' => 'whsec_test']]);

        $payload = '{"id":"evt_1","type":"payment_intent.succeeded"}';
        $timestamp = (string) time();
        $valid = 't='.$timestamp.',v1='.hash_hmac('sha256', $timestamp.'.'.$payload, 'whsec_test');

        $driver = new StripeDriver;

        $this->assertTrue($driver->verifyWebhook($config, ['__raw' => $payload], $valid));
        $this->assertFalse($driver->verifyWebhook($config, ['__raw' => $payload], 't='.$timestamp.',v1=deadbeef'));
        $this->assertFalse($driver->verifyWebhook($config, ['__raw' => $payload], null));
    }

    public function test_configured_gateway_charges_via_driver_and_returns_a_redirect(): void
    {
        Http::fake(['*' => Http::response(['GatewayPageURL' => 'https://pay.example/checkout', 'tran_id' => 'T1'], 200)]);

        $config = new TenantGateway(['provider' => 'sslcommerz', 'environment' => 'sandbox', 'credentials' => ['store_id' => 's', 'store_password' => 'p']]);
        $gateway = new ConfiguredGateway(new SslCommerzDriver, $config);

        $result = $gateway->charge(['amount' => 250, 'currency' => 'BDT', 'reference' => 'ORD-1']);

        $this->assertSame('pending', $result['status']);
        $this->assertSame('https://pay.example/checkout', $result['redirect_url']);
        $this->assertSame('sslcommerz', $gateway->name());
    }

    public function test_sslcommerz_webhook_only_settles_after_server_side_verification(): void
    {
        $owner = $this->owner();
        $tenant = $owner->tenant;

        TenantGateway::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'is_default' => true,
            'supported_currencies' => ['BDT'],
            'credentials' => ['store_id' => 's', 'store_password' => 'p'],
        ]);

        $branch = Branch::factory()->create(['tenant_id' => $tenant->id, 'code' => 'MAIN']);

        $order = Order::create([
            'tenant_id' => $tenant->id,
            'branch_id' => $branch->id,
            'user_id' => $owner->id,
            'order_number' => 'ORD-1',
            'status' => 'held',
            'total' => 250,
            'currency' => 'BDT',
            'placed_at' => now(),
        ]);

        $payment = Payment::create([
            'tenant_id' => $tenant->id,
            'order_id' => $order->id,
            'amount' => 250,
            'status' => 'pending',
            'reference' => 'TXN-1',
        ]);

        // First provider lookup says the transaction is invalid, the second confirms it.
        $calls = 0;
        Http::fake(function () use (&$calls) {
            $calls++;

            return $calls === 1
                ? Http::response(['status' => 'INVALID'], 200)
                : Http::response(['status' => 'VALID', 'amount' => 250, 'currency' => 'BDT'], 200);
        });

        // The payload claims "paid" but the provider says the transaction is invalid.
        app(WebhookService::class)->handle(
            'sslcommerz',
            json_encode(['reference' => 'TXN-1', 'status' => 'paid']),
            null,
            ['reference' => 'TXN-1', 'status' => 'paid', 'event_id' => 'evt-1'],
        );

        $this->assertSame('pending', $payment->fresh()->status->value);

        // Provider confirms the transaction → it settles.
        app(WebhookService::class)->handle(
            'sslcommerz',
            json_encode(['reference' => 'TXN-1', 'status' => 'paid']),
            null,
            ['reference' => 'TXN-1', 'status' => 'paid', 'event_id' => 'evt-2'],
        );

        $this->assertSame('succeeded', $payment->fresh()->status->value);
    }
}
