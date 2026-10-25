<?php

namespace Tests\Feature\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\StockService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\Recipe;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosSaleTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected Shift $shift;

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

        $this->branch = Branch::factory()->create([
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN',
        ]);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        $this->shift = app(ShiftService::class)->open($this->branch, $this->user, 100);
    }

    protected function cashMethod(): PaymentMethod
    {
        return $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();
    }

    protected function product(array $attributes = []): Product
    {
        return Product::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'name' => 'Burger',
            'price_dine_in' => 100,
            'price_takeaway' => 100,
            'price_delivery' => 100,
            'cost_price' => 40,
            'inventory_mode' => InventoryMode::None,
        ], $attributes));
    }

    protected function placeOrder(array $payload = [])
    {
        return $this->actingAs($this->user)->post('/pos/orders', array_merge([
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [],
            'payments' => [],
        ], $payload));
    }

    public function test_a_sale_requires_an_open_shift(): void
    {
        $this->shift->forceFill(['status' => 'closed'])->save();
        $product = $this->product();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertSessionHasErrors('shift');
    }

    public function test_a_cash_sale_completes_with_server_calculated_totals(): void
    {
        $product = $this->product();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 200, 'tendered' => 200]],
        ])->assertRedirect();

        $order = Order::firstOrFail();
        $this->assertSame('completed', $order->status->value);
        $this->assertSame(200.0, (float) $order->total);
        $this->assertSame(200.0, (float) $order->paid_total);
        $this->assertStringStartsWith('MAIN-', $order->order_number);
        $this->assertCount(1, $order->items);
        $this->assertCount(1, $order->payments);
    }

    public function test_change_due_is_calculated_for_cash(): void
    {
        $product = $this->product();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 150]],
        ])->assertRedirect();

        $order = Order::firstOrFail();
        $this->assertSame(50.0, (float) $order->change_due);
        $this->assertSame(50.0, (float) $order->payments->first()->change_due);
    }

    public function test_dine_in_requires_a_table_when_the_tenant_requires_one(): void
    {
        $this->tenant->mergeSettings(['pos.require_table_for_dine_in' => true]);
        $this->tenant->save();
        $this->user->unsetRelation('tenant');

        $product = $this->product();
        $items = [['product_id' => $product->id, 'quantity' => 1]];
        $payments = [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 100]];

        // A dine-in sale without a table is rejected...
        $this->placeOrder(['items' => $items, 'payments' => $payments])
            ->assertSessionHasErrors('table_id');

        // ...other order types are unaffected...
        $this->placeOrder(['order_type' => 'takeaway', 'items' => $items, 'payments' => $payments])
            ->assertRedirect();

        // ...and naming a table is accepted.
        $table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        $this->placeOrder(['table_id' => $table->id, 'items' => $items, 'payments' => $payments])
            ->assertRedirect();

        $this->assertSame($table->id, Order::where('order_type', 'dine_in')->firstOrFail()->table_id);
    }

    public function test_a_cash_sale_records_a_cash_movement_and_updates_expected_cash(): void
    {
        $product = $this->product();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertRedirect();

        $this->assertDatabaseHas('cash_movements', ['shift_id' => $this->shift->id, 'type' => 'sale', 'amount' => 100]);
        $this->assertSame(200.0, $this->shift->fresh()->currentExpectedCash());
    }

    public function test_selling_a_stock_tracked_product_deducts_stock(): void
    {
        $product = $this->product(['inventory_mode' => InventoryMode::Product]);
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        app(StockService::class)->receiveOpening($product, $location, 10);

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 300, 'tendered' => 300]],
        ])->assertRedirect();

        $this->assertSame(7.0, app(StockService::class)->balanceFor($product, $location));
        $this->assertDatabaseHas('stock_movements', ['stockable_id' => $product->id, 'reason' => 'sale', 'quantity_delta' => -3]);
    }

    public function test_selling_a_recipe_product_deducts_ingredients(): void
    {
        $ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Chicken']);
        $product = $this->product(['inventory_mode' => InventoryMode::Recipe]);
        $recipe = Recipe::create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'yield_quantity' => 1,
            'is_active' => true,
        ]);
        $recipe->items()->create([
            'tenant_id' => $this->tenant->id,
            'ingredient_id' => $ingredient->id,
            'quantity' => 0.2,
        ]);

        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        app(StockService::class)->receiveOpening($ingredient, $location, 5);

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 300, 'tendered' => 300]],
        ])->assertRedirect();

        // 3 servings × 0.2 kg = 0.6 kg deducted.
        $this->assertSame(4.4, round(app(StockService::class)->balanceFor($ingredient, $location), 3));
    }

    public function test_idempotency_key_prevents_duplicate_sales(): void
    {
        $product = $this->product();
        $payload = [
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 100]],
            'idempotency_key' => 'sale-abc-123',
        ];

        $this->placeOrder($payload)->assertRedirect();
        $this->placeOrder($payload)->assertRedirect();

        $this->assertSame(1, Order::count());
        $this->assertSame(1, Payment::count());
    }

    public function test_partial_payment_is_rejected_by_default(): void
    {
        $product = $this->product();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 40, 'tendered' => 40]],
        ])->assertSessionHasErrors('payments');

        $this->assertSame(0, Order::count());
    }

    public function test_split_payments_are_supported(): void
    {
        $product = $this->product(['price_dine_in' => 100]);
        $cash = $this->cashMethod();
        $card = $this->tenant->paymentMethods()->where('code', 'card')->firstOrFail();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [
                ['payment_method_id' => $cash->id, 'amount' => 60, 'tendered' => 60],
                ['payment_method_id' => $card->id, 'amount' => 40],
            ],
        ])->assertRedirect();

        $order = Order::firstOrFail();
        $this->assertCount(2, $order->payments);
        $this->assertSame(100.0, (float) $order->paid_total);
    }

    public function test_discount_above_threshold_requires_a_manager_pin(): void
    {
        $this->tenant->mergeSettings(['pos' => ['discount_approval_percent' => 10]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $product = $this->product();

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'discount_type' => 'percent',
            'discount_value' => 25,
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 75, 'tendered' => 75]],
        ])->assertSessionHasErrors('manager_pin');
    }

    public function test_unavailable_product_is_rejected(): void
    {
        $product = $this->product(['is_available' => false]);

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertSessionHasErrors('items');
    }

    public function test_a_cashier_without_pos_permission_cannot_sell(): void
    {
        // A user with no roles has no pos.use permission.
        $nobody = User::factory()->forTenant($this->tenant)->create();
        $product = $this->product();

        $this->actingAs($nobody)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100]],
        ])->assertForbidden();
    }

    public function test_pos_and_orders_pages_render_for_a_seller(): void
    {
        $product = $this->product();

        $this->actingAs($this->user)
            ->get('/pos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Pos/Index'));

        $this->actingAs($this->user)
            ->get('/orders')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Orders/Index'));

        $this->placeOrder([
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $this->cashMethod()->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertRedirect();

        $order = Order::firstOrFail();

        $this->actingAs($this->user)
            ->get(route('orders.receipt', $order))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Orders/Receipt'));
    }
}
