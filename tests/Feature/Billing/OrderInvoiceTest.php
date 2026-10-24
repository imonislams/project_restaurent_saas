<?php

namespace Tests\Feature\Billing;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Invoicing\Enums\InvoiceStatus;
use App\Domain\Invoicing\Models\Invoice;
use App\Domain\Invoicing\OrderInvoiceService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\POS\SaleService;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderInvoiceTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected Table $table;

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

        $this->table = Table::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
            'seats' => 4,
        ]);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->owner, 0);
    }

    protected function openServedOrderAt(Table $table, float $price = 100): Order
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price_dine_in' => $price,
            'inventory_mode' => InventoryMode::None,
        ]);

        $order = app(SaleService::class)->openOrder([
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'covers' => 2,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ], $this->owner, $this->branch);

        $kitchen = app(KitchenService::class);
        $ticket = $kitchen->openTicketFor($order->fresh());

        $kitchen->setTicketStatus($ticket, KitchenTicketStatus::Preparing);
        $kitchen->setTicketStatus($ticket->fresh(), KitchenTicketStatus::Ready);
        $kitchen->setTicketStatus($ticket->fresh(), KitchenTicketStatus::Served);

        return $order->fresh();
    }

    public function test_serving_an_order_creates_an_open_invoice(): void
    {
        $order = $this->openServedOrderAt($this->table, 150);

        $this->assertSame(1, Invoice::count());

        $invoice = Invoice::firstOrFail();
        $this->assertSame(InvoiceStatus::Open, $invoice->status);
        $this->assertSame(150.0, (float) $invoice->total);
        $this->assertSame($this->branch->id, $invoice->branch_id);
        $this->assertSame($this->table->id, $invoice->table_id);
        $this->assertStringStartsWith('BIL-', $invoice->number);
        $this->assertSame(1, $invoice->orders()->count());
        $this->assertDatabaseHas('invoice_orders', ['order_id' => $order->id, 'invoice_id' => $invoice->id]);
    }

    public function test_repeated_serving_never_duplicates_the_invoice(): void
    {
        $order = $this->openServedOrderAt($this->table);

        $kitchen = app(KitchenService::class);
        // Re-apply the same terminal status (idempotent no-op).
        $kitchen->setTicketStatus($order->fresh()->kitchenTicket, KitchenTicketStatus::Served);

        // And call the invoice service directly again.
        app(OrderInvoiceService::class)->forServedOrder($order->fresh());

        $this->assertSame(1, Invoice::count());
        $this->assertSame(1, Invoice::firstOrFail()->orders()->count());
    }

    public function test_additional_served_orders_join_the_open_invoice(): void
    {
        $this->openServedOrderAt($this->table, 100);
        $this->openServedOrderAt($this->table, 60);

        $this->assertSame(1, Invoice::count());
        $invoice = Invoice::firstOrFail();
        $this->assertSame(2, $invoice->orders()->count());
        $this->assertSame(160.0, (float) $invoice->total);
    }

    public function test_a_paid_invoice_is_not_reused_for_a_new_order(): void
    {
        $first = $this->openServedOrderAt($this->table, 100);
        $invoice = Invoice::firstOrFail();

        // Simulate settlement of the first invoice.
        $invoice->forceFill(['status' => InvoiceStatus::Paid, 'paid_total' => 100, 'paid_at' => now()])->save();

        $this->openServedOrderAt($this->table, 50);

        $this->assertSame(2, Invoice::count());
        $new = Invoice::where('status', InvoiceStatus::Open->value)->firstOrFail();
        $this->assertSame(50.0, (float) $new->total);
        $this->assertSame($first->id + 1, $new->id);
    }

    public function test_an_order_is_attached_to_at_most_one_invoice(): void
    {
        $order = $this->openServedOrderAt($this->table);
        $invoice = Invoice::firstOrFail();

        $service = app(OrderInvoiceService::class);
        $service->addOrder($invoice, $order->fresh());
        $service->addOrder($invoice, $order->fresh());

        $this->assertSame(1, $invoice->orders()->count());
    }

    public function test_invoice_pages_render_for_an_authorized_user(): void
    {
        $this->openServedOrderAt($this->table, 120);
        $invoice = Invoice::firstOrFail();

        $this->actingAs($this->owner)
            ->get('/invoices')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Invoices/Index')
                ->has('invoices.data', 1));

        $this->actingAs($this->owner)
            ->get("/invoices/{$invoice->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Invoices/Show')
                ->where('invoice.number', $invoice->number)
                ->has('invoice.orders', 1));
    }

    public function test_cash_settlement_marks_the_invoice_paid_and_links_the_payment(): void
    {
        $order = $this->openServedOrderAt($this->table, 100);
        $invoice = Invoice::firstOrFail();
        $this->assertSame(InvoiceStatus::Open, $invoice->status);

        $cash = PaymentMethod::query()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post("/orders/{$order->id}/settle", [
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 100, 'tendered' => 120]],
        ])->assertRedirect();

        $invoice->refresh();
        $this->assertSame(InvoiceStatus::Paid, $invoice->status);
        $this->assertSame(100.0, (float) $invoice->paid_total);
        $this->assertSame(0.0, $invoice->outstanding());
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'invoice_id' => $invoice->id,
            'status' => 'succeeded',
        ]);
    }
}
