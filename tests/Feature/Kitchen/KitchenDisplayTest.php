<?php

namespace Tests\Feature\Kitchen;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Enums\KitchenItemStatus;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Kitchen\Models\KitchenStation;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KitchenDisplayTest extends TestCase
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
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->owner, 100);
    }

    protected function station(string $name = 'Grill'): KitchenStation
    {
        return KitchenStation::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => $name,
            'sort_order' => 1,
        ]);
    }

    protected function sell(Product $product, int $quantity = 1): Order
    {
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => $product->price_dine_in * $quantity, 'tendered' => $product->price_dine_in * $quantity]],
        ])->assertRedirect();

        return Order::latest('id')->firstOrFail();
    }

    public function test_a_kitchen_ticket_is_created_after_a_sale_with_items_routed_to_stations(): void
    {
        $grill = $this->station('Grill');
        $drinks = $this->station('Drinks');

        $burger = Product::factory()->create(['tenant_id' => $this->tenant->id, 'kitchen_station_id' => $grill->id]);
        $cola = Product::factory()->create(['tenant_id' => $this->tenant->id, 'kitchen_station_id' => $drinks->id]);

        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $burger->id, 'quantity' => 2],
                ['product_id' => $cola->id, 'quantity' => 1],
            ],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 300, 'tendered' => 300]],
        ])->assertRedirect();

        $ticket = KitchenTicket::with('items')->firstOrFail();
        $this->assertSame(KitchenTicketStatus::New, $ticket->status);
        $this->assertCount(2, $ticket->items);
        $this->assertSame($grill->id, $ticket->items->firstWhere('name', 'like', '%'.$burger->name.'%')?->station_id ?? $ticket->items->first()->station_id);
        $this->assertDatabaseHas('audit_logs', ['action' => 'kitchen.ticket_opened']);
    }

    public function test_ticket_creation_is_idempotent_per_order(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $order = $this->sell($product);

        app(KitchenService::class)->openTicketFor($order->fresh());
        app(KitchenService::class)->openTicketFor($order->fresh());

        $this->assertSame(1, KitchenTicket::count());
    }

    public function test_ticket_status_transitions_set_timestamps_and_cascade_to_items(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->sell($product);
        $ticket = KitchenTicket::firstOrFail();

        $this->actingAs($this->owner)->patch("/kitchen/tickets/{$ticket->id}", ['status' => 'preparing'])->assertRedirect();
        $ticket->refresh();
        $this->assertSame(KitchenTicketStatus::Preparing, $ticket->status);
        $this->assertNotNull($ticket->accepted_at);

        $this->actingAs($this->owner)->patch("/kitchen/tickets/{$ticket->id}", ['status' => 'ready'])->assertRedirect();
        $this->assertSame(KitchenTicketStatus::Ready, $ticket->fresh()->status);
        $this->assertSame(KitchenItemStatus::Ready->value, $ticket->items()->first()->status->value);
    }

    public function test_marking_all_items_ready_advances_the_ticket(): void
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->sell($product);
        $ticket = KitchenTicket::with('items')->firstOrFail();

        foreach ($ticket->items as $item) {
            $this->actingAs($this->owner)->patch("/kitchen/items/{$item->id}", ['status' => 'ready'])->assertRedirect();
        }

        $this->assertSame(KitchenTicketStatus::Ready, $ticket->fresh()->status);
    }

    public function test_the_kds_board_renders_and_filters_by_station(): void
    {
        $grill = $this->station('Grill');
        $drinks = $this->station('Drinks');
        $burger = Product::factory()->create(['tenant_id' => $this->tenant->id, 'kitchen_station_id' => $grill->id]);
        $cola = Product::factory()->create(['tenant_id' => $this->tenant->id, 'kitchen_station_id' => $drinks->id]);

        $this->sell($burger);
        $this->sell($cola);

        $this->actingAs($this->owner)
            ->get('/kitchen')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Kitchen/Index')->has('tickets', 2));

        $this->actingAs($this->owner)
            ->get('/kitchen?station_id='.$grill->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Kitchen/Index')->has('tickets', 1));
    }

    public function test_cashiers_can_view_but_not_manage_kitchen_tickets(): void
    {
        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);
        $cashier->syncBranchAccess([$this->branch->id]);

        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->sell($product);
        $ticket = KitchenTicket::firstOrFail();

        $this->actingAs($cashier)->get('/kitchen')->assertOk();
        $this->actingAs($cashier)
            ->patch("/kitchen/tickets/{$ticket->id}", ['status' => 'preparing'])
            ->assertForbidden();
    }
}
