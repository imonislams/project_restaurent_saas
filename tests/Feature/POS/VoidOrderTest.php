<?php

namespace Tests\Feature\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VoidOrderTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

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

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->user, 100);
        app(ManagerPinService::class)->set($this->user, '1234');
        app(TenantContext::class)->set($this->tenant);
    }

    protected function completedOrder(Product $product, int $quantity = 2): Order
    {
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->user)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => $product->price_dine_in * $quantity, 'tendered' => $product->price_dine_in * $quantity]],
        ])->assertRedirect();

        return Order::latest('id')->firstOrFail();
    }

    public function test_voiding_requires_a_manager_pin(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $order = $this->completedOrder($product);

        $this->actingAs($this->user)->post("/orders/{$order->id}/void", [])
            ->assertSessionHasErrors('manager_pin');

        $this->assertSame('completed', $order->fresh()->status->value);
    }

    public function test_voiding_reverses_stock_and_marks_payments_refunded(): void
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::Product,
        ]);
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        app(StockService::class)->receiveOpening($product, $location, 10);

        $order = $this->completedOrder($product, 2);
        $this->assertSame(8.0, app(StockService::class)->balanceFor($product, $location));

        $this->actingAs($this->user)->post("/orders/{$order->id}/void", [
            'manager_pin' => '1234',
        ])->assertRedirect();

        $order->refresh();
        $this->assertSame('voided', $order->status->value);
        $this->assertNotNull($order->voided_at);
        // Stock returned.
        $this->assertSame(10.0, app(StockService::class)->balanceFor($product, $location));
        // Payments marked refunded.
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'refunded']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.voided']);
    }

    public function test_voiding_records_a_cash_refund_on_an_open_shift(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $order = $this->completedOrder($product, 1);

        $shiftId = $order->shift_id;

        $this->actingAs($this->user)->post("/orders/{$order->id}/void", [
            'manager_pin' => '1234',
        ])->assertRedirect();

        $this->assertDatabaseHas('cash_movements', ['shift_id' => $shiftId, 'type' => 'refund', 'amount' => -100]);
    }

    public function test_a_voided_order_cannot_be_voided_again(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $order = $this->completedOrder($product, 1);

        $this->actingAs($this->user)->post("/orders/{$order->id}/void", ['manager_pin' => '1234'])->assertRedirect();
        $this->actingAs($this->user)->post("/orders/{$order->id}/void", ['manager_pin' => '1234'])->assertSessionHasErrors('order');
    }
}
