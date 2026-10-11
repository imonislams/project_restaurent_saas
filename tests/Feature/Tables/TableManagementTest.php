<?php

namespace Tests\Feature\Tables;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableManagementTest extends TestCase
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

    protected function table(string $name = 'T1'): Table
    {
        return Table::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => $name,
            'seats' => 4,
        ]);
    }

    protected function openTableOrder(Table $table, Product $product, int $quantity = 1): Order
    {
        $this->actingAs($this->owner)->post('/pos/orders/open', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'covers' => 2,
            'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
        ])->assertRedirect();

        return Order::latest('id')->firstOrFail();
    }

    public function test_tables_can_be_created_updated_and_removed(): void
    {
        $this->actingAs($this->owner)->post('/tables', [
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'seats' => 4,
        ])->assertRedirect();

        $table = Table::firstOrFail();
        $this->assertSame(TableStatus::Available, $table->status);

        $this->actingAs($this->owner)->patch("/tables/{$table->id}", [
            'branch_id' => $this->branch->id,
            'name' => 'T1 (renamed)',
        ])->assertRedirect();
        $this->assertSame('T1 (renamed)', $table->fresh()->name);

        $this->actingAs($this->owner)->delete("/tables/{$table->id}")->assertRedirect();
        $this->assertSoftDeleted('tables', ['id' => $table->id]);
    }

    public function test_opening_a_table_order_marks_the_table_occupied(): void
    {
        $table = $this->table();
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);

        $order = $this->openTableOrder($table, $product);

        $this->assertTrue($order->isOpen());
        $this->assertSame($table->id, $order->table_id);
        $this->assertSame(2, $order->covers);
        $this->assertSame(TableStatus::Occupied, $table->fresh()->status);
    }

    public function test_settling_a_table_order_frees_the_table(): void
    {
        $table = $this->table();
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'price_dine_in' => 100]);
        $order = $this->openTableOrder($table, $product);
        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post("/orders/{$order->id}/settle", [
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 100, 'tendered' => 100]],
        ])->assertRedirect();

        $order->refresh();
        $this->assertSame('completed', $order->status->value);
        $this->assertSame(TableStatus::Available, $table->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.settled']);
    }

    public function test_transferring_an_order_moves_occupancy_between_tables(): void
    {
        $tableA = $this->table('A');
        $tableB = $this->table('B');
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $order = $this->openTableOrder($tableA, $product);

        $this->actingAs($this->owner)->post('/tables/transfer', [
            'order_id' => $order->id,
            'table_id' => $tableB->id,
        ])->assertRedirect();

        $this->assertSame($tableB->id, $order->fresh()->table_id);
        $this->assertSame(TableStatus::Occupied, $tableB->fresh()->status);
        $this->assertSame(TableStatus::Available, $tableA->fresh()->status);
    }

    public function test_a_table_with_open_orders_cannot_be_removed(): void
    {
        $table = $this->table();
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->openTableOrder($table, $product);

        $this->actingAs($this->owner)->delete("/tables/{$table->id}")->assertSessionHas('error');
        $this->assertNotSoftDeleted('tables', ['id' => $table->id]);
    }

    public function test_table_status_can_be_set_manually(): void
    {
        $table = $this->table();

        $this->actingAs($this->owner)->patch("/tables/{$table->id}/status", ['status' => 'cleaning'])->assertRedirect();

        $this->assertSame(TableStatus::Cleaning, $table->fresh()->status);
    }

    public function test_the_tables_page_renders(): void
    {
        $this->table();

        $this->actingAs($this->owner)
            ->get('/tables')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Tables/Index')->has('tables', 1));
    }
}
