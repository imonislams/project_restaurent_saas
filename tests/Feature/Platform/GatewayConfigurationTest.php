<?php

namespace Tests\Feature\Platform;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GatewayConfigurationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_multiple_named_gateways_can_be_enabled_together(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/gateways', [
            'name' => 'Manual',
            'provider' => 'manual',
            'environment' => 'production',
            'is_enabled' => true,
            'supported_currencies' => ['USD'],
        ])->assertRedirect();

        $this->actingAs($admin)->post('/platform/gateways', [
            'name' => 'SSLCommerz USD',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'supported_currencies' => ['USD'],
            'credentials' => ['store_id' => 'abc', 'store_password' => 'secret'],
        ])->assertRedirect();

        $this->assertSame(2, PaymentGateway::count());
        $this->assertSame(2, app(PlatformGatewayManager::class)->forCurrency('USD')->count());
        $this->assertSame(0, app(PlatformGatewayManager::class)->forCurrency('BDT')->count());
    }

    public function test_default_gateway_is_resolved_for_a_currency(): void
    {
        $admin = $this->admin();
        PaymentGateway::create(['name' => 'Manual', 'provider' => 'manual', 'environment' => 'production', 'is_enabled' => true, 'supported_currencies' => ['USD']]);
        $ssl = PaymentGateway::create(['name' => 'SSLCommerz', 'provider' => 'sslcommerz', 'environment' => 'sandbox', 'is_enabled' => true, 'supported_currencies' => ['USD'], 'credentials' => ['store_id' => 'a', 'store_password' => 'b']]);

        $this->actingAs($admin)->post("/platform/gateways/{$ssl->id}/default")->assertRedirect();

        $manager = app(PlatformGatewayManager::class);
        $this->assertSame($ssl->id, $manager->defaultFor('USD')?->id);

        // A gateway that only supports BDT is not offered for USD.
        $bdt = PaymentGateway::create(['name' => 'SSLCommerz BDT', 'provider' => 'sslcommerz', 'environment' => 'sandbox', 'is_enabled' => true, 'supported_currencies' => ['BDT'], 'credentials' => ['store_id' => 'a', 'store_password' => 'b']]);
        $this->assertFalse($manager->forCurrency('USD')->contains('id', $bdt->id));
    }

    public function test_invoice_offers_every_enabled_gateway_supporting_its_currency(): void
    {
        $admin = $this->admin();
        PaymentGateway::create(['name' => 'Manual', 'provider' => 'manual', 'environment' => 'production', 'is_enabled' => true, 'supported_currencies' => []]);
        PaymentGateway::create(['name' => 'Disabled', 'provider' => 'sslcommerz', 'environment' => 'sandbox', 'is_enabled' => false, 'supported_currencies' => []]);

        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);

        $this->actingAs($admin)->get("/platform/invoices/{$invoice->id}")->assertOk()
            ->assertInertia(fn ($page) => $page->has('gateways', 1));
    }

    public function test_manual_payment_can_be_settled_which_pays_the_invoice(): void
    {
        $admin = $this->admin();
        $config = PaymentGateway::create(['name' => 'Manual', 'provider' => 'manual', 'environment' => 'production', 'is_enabled' => true, 'supported_currencies' => []]);

        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);

        $this->actingAs($admin)->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id])->assertRedirect();

        $payment = PlatformPayment::firstOrFail();
        $this->assertSame(PlatformPaymentStatus::Pending, $payment->status);

        $this->actingAs($admin)->post("/platform/payments/{$payment->id}/settle")->assertRedirect();

        $this->assertSame(PlatformPaymentStatus::Succeeded, $payment->fresh()->status);
        $this->assertSame('paid', $invoice->fresh()->status->value);
    }

    public function test_a_gateway_can_be_toggled_and_deleted(): void
    {
        $admin = $this->admin();
        $config = PaymentGateway::create(['name' => 'Manual', 'provider' => 'manual', 'environment' => 'production', 'is_enabled' => true, 'supported_currencies' => []]);

        $this->actingAs($admin)->post("/platform/gateways/{$config->id}/toggle")->assertRedirect();
        $this->assertFalse($config->fresh()->is_enabled);

        $this->actingAs($admin)->delete("/platform/gateways/{$config->id}")->assertRedirect();
        $this->assertDatabaseMissing('payment_gateways', ['id' => $config->id]);
    }

    public function test_saving_a_configuration_does_not_silently_disable_the_gateway(): void
    {
        $admin = $this->admin();
        $config = PaymentGateway::create([
            'name' => 'SSLCommerz',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'supported_currencies' => ['USD'],
            'credentials' => ['store_id' => 'a', 'store_password' => 'b'],
        ]);

        // The tabbed form owns "enabled" through its own switch, so the save
        // payload no longer carries the flag.
        $this->actingAs($admin)->patch("/platform/gateways/{$config->id}", [
            'name' => 'SSLCommerz',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'supported_currencies' => ['USD', 'BDT'],
        ])->assertRedirect();

        $config->refresh();
        $this->assertTrue($config->is_enabled);
        $this->assertSame(['USD', 'BDT'], $config->supported_currencies);
    }

    public function test_disabling_a_gateway_removes_it_from_the_tenant_plan_change_flow(): void
    {
        $admin = $this->admin();
        $config = PaymentGateway::create([
            'name' => 'SSLCommerz',
            'provider' => 'sslcommerz',
            'environment' => 'sandbox',
            'is_enabled' => true,
            'supported_currencies' => ['USD'],
            'credentials' => ['store_id' => 'a', 'store_password' => 'b'],
        ]);

        $tenant = Tenant::factory()->create();
        $plan = $tenant->subscription->plan;

        $eligibility = app(\App\Domain\Billing\GatewayEligibilityService::class);

        $this->assertTrue($eligibility->eligibleFor($tenant, $plan, 'USD')->contains('id', $config->id));

        $this->actingAs($admin)->post("/platform/gateways/{$config->id}/toggle")->assertRedirect();

        $this->assertFalse($eligibility->eligibleFor($tenant, $plan, 'USD')->contains('id', $config->id));
    }
}
