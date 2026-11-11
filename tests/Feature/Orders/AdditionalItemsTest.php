<?php

namespace Tests\Feature\Orders;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Invoicing\Models\Invoice;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Kitchen\Models\KitchenTicketItem;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdditionalItemsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Table $table;

    protected User $owner;

    protected Product $burger;

    protected Product $pizza;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->tenant->mergeSettings([
            'tax' => ['rate' => 10, 'inclusive' => false],
            'service_charge.rate' => 5,
            'pos.require_table_for_dine_in' => true,
            'orders.allow_additional_items' => true,
            'orders.send_confirmed_to_kitchen' => true,
        ]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        $this->table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->owner, 100);

        $this->burger = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Burger',
            'price_dine_in' => 100,
            'inventory_mode' => InventoryMode::None,
        ]);

        $this->pizza = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Pizza',
            'price_dine_in' => 50,
            'inventory_mode' => InventoryMode::None,
        ]);
    }

    protected function openOrder(): Order
    {
        $this->actingAs($this->owner)->post('/pos/orders/open', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $this->table->id,
            'items' => [['product_id' => $this->burger->id, 'quantity' => 2]],
        ])->assertRedirect();

        return Order::firstOrFail();
    }

    protected function append(Order $order, string $key = 'append-1', ?Product $product = null, float $quantity = 2)
    {
        return $this->actingAs($this->owner)->post("/orders/{$order->id}/items", [
            'idempotency_key' => $key,
            'items' => [['product_id' => ($product ?? $this->pizza)->id, 'quantity' => $quantity]],
        ]);
    }

    public function test_items_can_be_appended_to_an_active_order(): void
    {
        $order = $this->openOrder();
        $originalItem = $order->items()->firstOrFail();
        $original = $originalItem->only(['name', 'quantity', 'unit_price', 'line_total', 'discount_amount']);

        $this->append($order)->assertRedirect(route('orders.show', $order));

        $order = $order->fresh();

        $this->assertSame(2, $order->rounds()->count());
        $this->assertSame(300.0, (float) $order->subtotal);
        $this->assertSame(30.0, (float) $order->tax_total);
        $this->assertSame(330.0, (float) $order->total);

        $this->assertSame(
            $original,
            $order->items()->findOrFail($originalItem->id)->only(['name', 'quantity', 'unit_price', 'line_total', 'discount_amount']),
        );
    }

    public function test_only_the_new_items_reach_the_kitchen(): void
    {
        $order = $this->openOrder();
        $this->append($order)->assertRedirect();

        $tickets = KitchenTicket::orderBy('id')->get();

        $this->assertCount(2, $tickets);
        $this->assertSame(1, $tickets[0]->items()->count());
        $this->assertSame('Burger', $tickets[0]->items()->first()->name);
        $this->assertSame(1, $tickets[1]->items()->count());
        $this->assertSame('Pizza', $tickets[1]->items()->first()->name);
        $this->assertSame(2, KitchenTicketItem::count());
    }

    public function test_repeating_the_same_key_does_not_add_a_second_round(): void
    {
        $order = $this->openOrder();

        $this->append($order, 'same-key')->assertRedirect();
        $this->append($order, 'same-key')->assertRedirect();

        $this->assertSame(2, $order->rounds()->count());
        $this->assertSame(2, $order->items()->count());
    }

    public function test_the_setting_off_refuses_additional_items(): void
    {
        $order = $this->openOrder();

        $this->tenant->mergeSettings(['orders.allow_additional_items' => false]);
        $this->tenant->save();

        // actingAs() keeps the same User instance across test requests, so the
        // cached tenant relation must be dropped to see the new setting.
        $this->owner->unsetRelation('tenant');

        $this->append($order)->assertSessionHasErrors('items');

        $this->assertSame(1, $order->rounds()->count());
        $this->assertSame(220.0, (float) $order->fresh()->total);
    }

    public function test_a_completed_order_cannot_accept_additional_items(): void
    {
        $order = $this->openOrder();
        $order->forceFill(['status' => 'completed', 'completed_at' => now()])->save();

        $this->append($order)->assertSessionHasErrors('order');

        $this->assertSame(1, $order->rounds()->count());
    }

    public function test_a_finalized_invoice_blocks_additional_items(): void
    {
        $order = $this->openOrder();

        $invoice = Invoice::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'table_id' => $this->table->id,
            'number' => 'BIL-20261111-0001',
            'status' => 'paid',
            'currency' => $order->currency,
            'issued_at' => now(),
        ]);

        $invoice->orders()->attach($order->id, [
            'tenant_id' => $this->tenant->id,
            'amount' => (float) $order->total,
            'added_at' => now(),
        ]);

        $this->append($order)->assertSessionHasErrors('order');

        $this->assertSame(1, $order->rounds()->count());
    }

    public function test_a_user_without_orders_update_cannot_append_items(): void
    {
        $order = $this->openOrder();

        $staff = User::factory()->forTenant($this->tenant)->create();
        $staff->assignRole(RoleName::TableStaff);
        $staff->branches()->attach($this->branch->id, ['tenant_id' => $this->tenant->id]);
        $staff->forgetBranchAccessCache();

        $this->actingAs($staff)->post("/orders/{$order->id}/items", [
            'idempotency_key' => 'denied',
            'items' => [['product_id' => $this->pizza->id, 'quantity' => 1]],
        ])->assertForbidden();

        $this->assertSame(1, $order->rounds()->count());
    }

    public function test_cancelling_a_round_recalculates_the_bill_and_cancels_its_ticket(): void
    {
        $order = $this->openOrder();
        $this->append($order)->assertRedirect();

        $round = $order->rounds()->where('round_no', 2)->firstOrFail();
        $ticket = KitchenTicket::where('order_round_id', $round->id)->firstOrFail();

        $this->actingAs($this->owner)
            ->post("/orders/{$order->id}/rounds/{$round->id}/cancel", ['reason' => 'Out of stock'])
            ->assertRedirect();

        $order = $order->fresh();

        $this->assertSame('cancelled', $round->fresh()->status);
        $this->assertSame(KitchenTicketStatus::Cancelled, $ticket->fresh()->status);
        $this->assertSame(200.0, (float) $order->subtotal);
        $this->assertSame(20.0, (float) $order->tax_total);
        $this->assertSame(220.0, (float) $order->total);
        $this->assertSame(1, $order->rounds()->where('status', 'active')->count());
    }

    public function test_the_order_screen_exposes_rounds_and_the_append_flag(): void
    {
        $order = $this->openOrder();
        $this->append($order)->assertRedirect();

        $this->actingAs($this->owner)
            ->get("/orders/{$order->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Orders/Show')
                ->where('order.can_append', true)
                ->has('order.rounds', 2)
                ->has('order.items', 2)
                ->where('order.items.1.round_no', 2));
    }
}
