<?php

namespace Tests\Feature\Purchasing;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\StockService;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchasingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected Supplier $supplier;

    protected Ingredient $ingredient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id]);
        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);

        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);

        $this->supplier = Supplier::create(['tenant_id' => $this->tenant->id, 'name' => 'Fresh Foods']);
        $this->ingredient = Ingredient::factory()->create(['tenant_id' => $this->tenant->id, 'name' => 'Tomato', 'cost_per_unit' => 2]);
    }

    protected function createOrder(float $quantity = 10, float $unitCost = 2): PurchaseOrder
    {
        $this->actingAs($this->owner)->post('/purchasing/orders', [
            'supplier_id' => $this->supplier->id,
            'branch_id' => $this->branch->id,
            'items' => [[
                'item_type' => 'ingredient',
                'item_id' => $this->ingredient->id,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
            ]],
        ])->assertRedirect();

        return PurchaseOrder::latest('id')->firstOrFail();
    }

    public function test_a_draft_purchase_order_is_created_with_computed_totals(): void
    {
        $order = $this->createOrder(10, 2);

        $this->assertStringStartsWith('PO-', $order->number);
        $this->assertSame('draft', $order->status->value);
        $this->assertSame('20.00', $order->total);
        $this->assertCount(1, $order->items);
    }

    public function test_order_can_be_submitted_and_approved(): void
    {
        $order = $this->createOrder();

        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/submit")->assertRedirect();
        $this->assertSame('submitted', $order->fresh()->status->value);

        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/approve")->assertRedirect();
        $this->assertSame('approved', $order->fresh()->status->value);
    }

    public function test_approval_above_the_limit_requires_a_manager_pin(): void
    {
        $this->tenant->mergeSettings(['purchasing' => ['approval_limit' => 10]]);
        $this->tenant->save();
        app(TenantContext::class)->set($this->tenant);

        $order = $this->createOrder(10, 2);
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/submit")->assertRedirect();

        $this->actingAs($this->owner)
            ->post("/purchasing/orders/{$order->id}/approve")
            ->assertSessionHasErrors('manager_pin');

        app(ManagerPinService::class)->set($this->owner, '4321');
        app(TenantContext::class)->set($this->tenant);

        $this->actingAs($this->owner)
            ->post("/purchasing/orders/{$order->id}/approve", ['manager_pin' => '4321'])
            ->assertRedirect();

        $this->assertSame('approved', $order->fresh()->status->value);
    }

    public function test_receiving_goods_increases_stock_and_records_a_receipt(): void
    {
        $order = $this->createOrder(10, 2);
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/submit");
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/approve");

        $item = $order->items()->first();

        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/receive", [
            'lines' => [['purchase_order_item_id' => $item->id, 'quantity' => 6, 'rejected_quantity' => 1]],
        ])->assertRedirect();

        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($this->branch);
        $this->assertSame(6.0, app(StockService::class)->balanceFor($this->ingredient, $location));

        $order->refresh();
        $this->assertSame('partially_received', $order->status->value);
        $this->assertSame('6.000', $item->fresh()->received_quantity);

        $this->assertDatabaseHas('goods_receipts', ['purchase_order_id' => $order->id]);
        $this->assertDatabaseHas('stock_movements', ['reason' => 'purchase', 'stockable_id' => $this->ingredient->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'goods_received']);
    }

    public function test_receiving_the_remainder_completes_the_order(): void
    {
        $order = $this->createOrder(10, 2);
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/submit");
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/approve");

        $item = $order->items()->first();

        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/receive", [
            'lines' => [['purchase_order_item_id' => $item->id, 'quantity' => 10]],
        ])->assertRedirect();

        $this->assertSame('received', $order->fresh()->status->value);
    }

    public function test_goods_cannot_be_received_against_a_draft_order(): void
    {
        $order = $this->createOrder();
        $item = $order->items()->first();

        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/receive", [
            'lines' => [['purchase_order_item_id' => $item->id, 'quantity' => 5]],
        ])->assertSessionHasErrors('status');
    }

    public function test_supplier_payments_reduce_the_outstanding_balance(): void
    {
        $order = $this->createOrder(10, 2);
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/submit");
        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/approve");

        $this->actingAs($this->owner)->post("/purchasing/orders/{$order->id}/payments", [
            'amount' => 12,
            'method' => 'bank',
        ])->assertRedirect();

        $this->assertSame(8.0, $this->supplier->fresh()->outstandingBalance());
        $this->assertDatabaseHas('audit_logs', ['action' => 'supplier.payment_recorded']);
    }

    public function test_suppliers_can_be_managed(): void
    {
        $this->actingAs($this->owner)->post('/purchasing/suppliers', [
            'name' => 'New Supplier',
            'phone' => '555',
        ])->assertRedirect();

        $supplier = Supplier::where('name', 'New Supplier')->firstOrFail();

        $this->actingAs($this->owner)->patch("/purchasing/suppliers/{$supplier->id}", [
            'name' => 'Renamed Supplier',
        ])->assertRedirect();

        $this->assertSame('Renamed Supplier', $supplier->fresh()->name);
    }
}
