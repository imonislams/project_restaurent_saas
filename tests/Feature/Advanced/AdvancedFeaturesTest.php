<?php

namespace Tests\Feature\Advanced;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Loyalty\LoyaltyService;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\Models\PaymentWebhookEvent;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AdvancedFeaturesTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        // The dine-in table requirement has its own test; these tests cover other behaviour.
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false], 'pos.require_table_for_dine_in' => false]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->owner, 0);
    }

    protected function product(float $price = 100): Product
    {
        return Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => $price,
            'price_takeaway' => $price,
            'price_delivery' => $price,
            'cost_price' => 0,
        ]);
    }

    protected function cashMethodId(): int
    {
        return (int) $this->tenant->paymentMethods()->where('code', 'cash')->value('id');
    }

    public function test_loyalty_points_are_earned_on_a_sale_with_a_customer(): void
    {
        $this->tenant->mergeSettings(['loyalty' => ['enabled' => true, 'points_per_currency' => 1]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $customer = Customer::create(['tenant_id' => $this->tenant->id, 'name' => 'Rahim']);
        $product = $this->product(100);

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'customer_id' => $customer->id,
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payments' => [['payment_method_id' => $this->cashMethodId(), 'amount' => 200, 'tendered' => 200]],
        ])->assertRedirect();

        $this->assertSame(200, (int) $customer->fresh()->loyaltyAccount?->points_balance);
    }

    public function test_points_can_be_redeemed_and_cannot_go_negative(): void
    {
        $customer = Customer::create(['tenant_id' => $this->tenant->id, 'name' => 'Karim']);
        $loyalty = app(LoyaltyService::class);

        $loyalty->earn($customer, 100);

        $loyalty->redeem($customer, 40);
        $this->assertSame(60, (int) $customer->fresh()->loyaltyAccount->points_balance);

        $this->expectException(ValidationException::class);
        $loyalty->redeem($customer, 1000);
    }

    public function test_delivery_zone_fee_is_added_to_the_order_total(): void
    {
        $zone = DeliveryZone::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Zone A',
            'fee' => 25,
            'min_order' => 100,
        ]);
        $product = $this->product(100);

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'delivery',
            'delivery_zone_id' => $zone->id,
            'delivery_address' => '12 Gulshan Ave',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payments' => [['payment_method_id' => $this->cashMethodId(), 'amount' => 225, 'tendered' => 225]],
        ])->assertRedirect();

        $order = Order::firstOrFail();
        $this->assertSame('25.00', $order->delivery_fee);
        $this->assertSame(225.0, (float) $order->total);
        $this->assertSame('12 Gulshan Ave', $order->delivery_address);
    }

    public function test_a_zone_minimum_order_is_enforced(): void
    {
        $zone = DeliveryZone::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Zone B',
            'fee' => 10,
            'min_order' => 500,
        ]);
        $product = $this->product(100);

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'delivery',
            'delivery_zone_id' => $zone->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethodId(), 'amount' => 110, 'tendered' => 110]],
        ])->assertSessionHasErrors('delivery_zone_id');

        $this->assertSame(0, Order::count());
    }

    public function test_customers_can_be_managed(): void
    {
        $this->actingAs($this->owner)->post('/customers', [
            'name' => 'New Guest',
            'phone' => '01700000000',
        ])->assertRedirect();

        $this->assertDatabaseHas('customers', ['name' => 'New Guest']);
    }

    public function test_a_signed_webhook_is_verified_recorded_and_processed(): void
    {
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->owner->id,
            'order_number' => 'TEST-1',
            'order_type' => 'counter',
            'status' => 'completed',
            'fulfillment_status' => 'new',
            'subtotal' => 100,
            'total' => 100,
            'currency' => 'USD',
            'placed_at' => now(),
        ]);

        $payment = Payment::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'amount' => 100,
            'status' => 'pending',
            'reference' => 'REF-1',
        ]);

        $payload = json_encode(['id' => 'evt_1', 'type' => 'payment.succeeded', 'status' => 'succeeded', 'reference' => 'REF-1']);
        $signature = hash_hmac('sha256', $payload, (string) config('services.payments.stub_secret'));

        $response = $this->call('POST', '/webhooks/payments/stub', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $signature,
        ], $payload);

        $response->assertOk()->assertJsonPath('valid', true);
        $this->assertSame(1, PaymentWebhookEvent::withoutGlobalScopes()->count());
        $this->assertSame('succeeded', $payment->fresh()->status->value);
    }

    public function test_an_unsigned_or_invalid_webhook_is_rejected_and_not_processed(): void
    {
        $event = json_encode(['id' => 'evt_2', 'type' => 'payment.succeeded', 'status' => 'succeeded', 'reference' => 'NOPE']);

        $this->call('POST', '/webhooks/payments/stub', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => 'invalid',
        ], $event)->assertStatus(401);
    }

    public function test_a_duplicate_webhook_event_is_not_processed_twice(): void
    {
        $payload = json_encode(['id' => 'evt_dupe', 'type' => 'payment.succeeded']);
        $signature = hash_hmac('sha256', $payload, (string) config('services.payments.stub_secret'));
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => $signature];

        $this->call('POST', '/webhooks/payments/stub', [], [], [], $headers, $payload)->assertOk();
        $this->call('POST', '/webhooks/payments/stub', [], [], [], $headers, $payload)
            ->assertOk()->assertJsonPath('duplicate', true);

        $this->assertSame(1, PaymentWebhookEvent::withoutGlobalScopes()->count());
    }
}
