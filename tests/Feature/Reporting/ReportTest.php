<?php

namespace Tests\Feature\Reporting;

use App\Domain\Accounting\Models\Expense;
use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Models\Product;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Reporting\ReportService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
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
        $this->tenant->mergeSettings([
            'tax' => ['rate' => 10, 'inclusive' => false],
            'region' => ['timezone' => 'Asia/Dhaka', 'currency' => 'BDT'],
        ]);
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

    protected function sellProduct(): Product
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Biryani',
            'price_dine_in' => 100,
            'price_takeaway' => 100,
            'price_delivery' => 100,
            'cost_price' => 40,
        ]);

        $cash = $this->tenant->paymentMethods()->where('code', 'cash')->firstOrFail();

        $this->actingAs($this->owner)->post('/pos/orders', [
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 220, 'tendered' => 220]],
        ])->assertRedirect();

        return $product;
    }

    protected function period(): ReportPeriod
    {
        return ReportPeriod::make(null, null, null, $this->tenant, $this->branch);
    }

    protected function summary(array $report, string $label): mixed
    {
        foreach ($report['summary'] as $item) {
            if ($item['label'] === $label) {
                return $item['value'];
            }
        }

        $this->fail("Summary label [{$label}] not found.");
    }

    public function test_sales_report_computes_gross_net_and_tax(): void
    {
        $this->sellProduct();

        $sales = app(ReportService::class)->sales($this->period());

        $this->assertSame(200.0, $this->summary($sales, 'Gross sales'));
        $this->assertSame(20.0, $this->summary($sales, 'Tax collected'));
        $this->assertSame(200.0, $this->summary($sales, 'Net sales (excl. tax)'));
        $this->assertSame(1, $this->summary($sales, 'Orders'));
    }

    public function test_product_report_lists_revenue_and_cogs(): void
    {
        $this->sellProduct();

        $products = app(ReportService::class)->products($this->period());

        $row = $products['rows'][0];
        $this->assertSame('Biryani', $row['product']);
        $this->assertSame(200.0, $row['revenue']);
        $this->assertSame(80.0, $row['cogs']);
        $this->assertSame(120.0, $row['margin']);
    }

    public function test_payment_report_groups_by_method(): void
    {
        $this->sellProduct();

        $payments = app(ReportService::class)->payments($this->period());

        $this->assertSame('Cash', $payments['rows'][0]['method']);
        $this->assertSame(220.0, $payments['rows'][0]['amount']);
    }

    public function test_cash_report_lists_shifts(): void
    {
        $this->sellProduct();

        $cash = app(ReportService::class)->cash($this->period());

        $this->assertSame(1, $this->summary($cash, 'Shifts'));
        $this->assertSame(220.0, $this->summary($cash, 'Cash sales'));
    }

    public function test_profit_report_reconciles_net_operating_result(): void
    {
        $this->sellProduct();

        $this->actingAs($this->owner)->post('/expenses', [
            'branch_id' => $this->branch->id,
            'amount' => 30,
            'description' => 'Gas',
        ])->assertRedirect();
        $expense = Expense::firstOrFail();
        $this->actingAs($this->owner)->post("/expenses/{$expense->id}/approve")->assertRedirect();

        app(TenantContext::class)->set($this->tenant);
        $profit = app(ReportService::class)->profit($this->period());

        $this->assertSame(200.0, $this->summary($profit, 'Net sales (excl. tax)'));
        $this->assertSame(80.0, $this->summary($profit, 'Cost of goods sold'));
        $this->assertSame(120.0, $this->summary($profit, 'Gross profit'));
        $this->assertSame(30.0, $this->summary($profit, 'Operating expenses'));
        $this->assertSame(90.0, $this->summary($profit, 'Net operating result'));
    }

    public function test_tax_report_totals_taxable_and_tax(): void
    {
        $this->sellProduct();

        $tax = app(ReportService::class)->tax($this->period());

        $this->assertSame(200.0, $this->summary($tax, 'Taxable sales'));
        $this->assertSame(20.0, $this->summary($tax, 'Tax collected'));
    }

    public function test_expense_report_includes_approved_expenses(): void
    {
        $this->actingAs($this->owner)->post('/expenses', [
            'amount' => 45,
            'description' => 'Water',
        ])->assertRedirect();
        $expense = Expense::firstOrFail();
        $this->actingAs($this->owner)->post("/expenses/{$expense->id}/approve")->assertRedirect();

        app(TenantContext::class)->set($this->tenant);
        $report = app(ReportService::class)->expenses($this->period());

        $this->assertSame(45.0, $this->summary($report, 'Total'));
    }

    public function test_reports_page_renders_and_supports_each_type(): void
    {
        $this->sellProduct();

        $this->actingAs($this->owner)
            ->get('/reports?type=sales')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Reports/Index')->where('type', 'sales')->has('report.summary'));

        $this->actingAs($this->owner)
            ->get('/reports?type=profit')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Reports/Index')->where('type', 'profit'));
    }

    public function test_unknown_report_type_falls_back_to_sales(): void
    {
        $this->actingAs($this->owner)
            ->get('/reports?type=bogus')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('type', 'sales'));
    }

    public function test_a_user_without_reports_permission_is_forbidden(): void
    {
        $cashier = User::factory()->forTenant($this->tenant)->create();
        $cashier->assignRole(RoleName::Cashier);

        $this->actingAs($cashier)->get('/reports')->assertForbidden();
    }
}
