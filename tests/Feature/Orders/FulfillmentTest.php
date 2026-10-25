<?php

namespace Tests\Feature\Orders;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FulfillmentTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected Order $order;

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
        app(ShiftService::class)->open($this->branch, $this->owner, 100);

        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'takeaway',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertRedirect();

        $this->order = Order::firstOrFail();
    }

    public function test_fulfillment_starts_as_new(): void
    {
        $this->assertSame('new', $this->order->fulfillment_status->value);
    }

    public function test_allowed_fulfillment_transitions_succeed(): void
    {
        $this->actingAs($this->owner)
            ->patch("/orders/{$this->order->id}/fulfillment", ['fulfillment_status' => 'preparing'])
            ->assertRedirect();

        $this->assertSame('preparing', $this->order->fresh()->fulfillment_status->value);

        $this->actingAs($this->owner)
            ->patch("/orders/{$this->order->id}/fulfillment", ['fulfillment_status' => 'ready'])
            ->assertRedirect();

        $this->assertSame('ready', $this->order->fresh()->fulfillment_status->value);
    }

    public function test_invalid_fulfillment_transition_is_rejected(): void
    {
        $this->actingAs($this->owner)
            ->patch("/orders/{$this->order->id}/fulfillment", ['fulfillment_status' => 'delivered'])
            ->assertSessionHasErrors('fulfillment_status');

        $this->assertSame('new', $this->order->fresh()->fulfillment_status->value);
    }

    public function test_order_detail_exposes_kitchen_and_fulfillment_state(): void
    {
        $this->actingAs($this->owner)
            ->get("/orders/{$this->order->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Orders/Show')
                ->where('order.fulfillment_status', 'new')
                ->has('nextFulfillment'));
    }
}
