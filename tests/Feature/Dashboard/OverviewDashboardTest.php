<?php

namespace Tests\Feature\Dashboard;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Models\Product;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\Payment;
use App\Domain\Reporting\DashboardAnalyticsService;
use App\Domain\Reporting\DashboardOverviewService;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Reporting\ReportService;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OverviewDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create(['onboarding_completed_at' => now()]);
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

    protected function sellProduct(): void
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
    }

    protected function todayPeriod(): ReportPeriod
    {
        return ReportPeriod::make(null, null, null, $this->tenant, $this->branch);
    }

    protected function kpi(array $kpis, string $label): mixed
    {
        foreach ($kpis as $kpi) {
            if ($kpi['label'] === $label) {
                return $kpi['value'];
            }
        }

        $this->fail("KPI [{$label}] not found.");
    }

    public function test_overview_kpis_use_sales_and_collected_bases(): void
    {
        $this->sellProduct();

        $data = app(DashboardOverviewService::class)->build($this->tenant, $this->todayPeriod());

        // Net sales = total (220) − tax (20); collected = the successful payment.
        $this->assertSame(200.0, $this->kpi($data['kpis'], 'dash.kpi.net_sales'));
        $this->assertSame(1, $this->kpi($data['kpis'], 'dash.kpi.orders'));
        $this->assertSame(200.0, $this->kpi($data['kpis'], 'dash.kpi.average_ticket'));
        $this->assertSame(220.0, $this->kpi($data['kpis'], 'dash.kpi.payments_collected'));
    }

    public function test_profitability_matches_the_profit_report(): void
    {
        $this->sellProduct();

        $profit = app(DashboardOverviewService::class)->build($this->tenant, $this->todayPeriod())['profit'];

        $this->assertSame(200.0, $this->kpi($profit, 'dash.kpi.net_sales_excl_tax'));
        $this->assertSame(80.0, $this->kpi($profit, 'dash.kpi.cogs'));
        $this->assertSame(120.0, $this->kpi($profit, 'dash.kpi.gross_profit'));
    }

    public function test_trend_includes_the_previous_period_for_overlay(): void
    {
        $this->sellProduct();

        $trend = app(DashboardOverviewService::class)->build($this->tenant, $this->todayPeriod())['trend'];

        $this->assertCount(24, $trend);
        $this->assertArrayHasKey('previous', $trend[0]);
        // Today's sales land in one hourly bucket; the previous (yesterday) is empty.
        $this->assertSame(200.0, array_sum(array_column($trend, 'value')));
        $this->assertSame(0.0, array_sum(array_column($trend, 'previous')));
    }

    public function test_collected_is_keyed_to_paid_at_not_order_date(): void
    {
        $this->sellProduct();

        $this->assertSame(220.0, app(ReportService::class)->collectedTotal($this->todayPeriod()));

        Payment::withoutGlobalScopes()->firstOrFail()
            ->forceFill(['paid_at' => Carbon::now('Asia/Dhaka')->subDays(2)->utc()])
            ->save();

        app(TenantContext::class)->set($this->tenant);

        // A payment taken two days ago no longer counts toward today's collections.
        $this->assertSame(0.0, app(ReportService::class)->collectedTotal($this->todayPeriod()));

        $wide = ReportPeriod::make(Carbon::now('Asia/Dhaka')->subDays(3)->toDateString(), null, null, $this->tenant, $this->branch);
        $this->assertSame(220.0, app(ReportService::class)->collectedTotal($wide));
    }

    public function test_collected_excludes_non_successful_payments(): void
    {
        $this->sellProduct();

        Payment::withoutGlobalScopes()->firstOrFail()->forceFill(['status' => PaymentStatus::Pending])->save();

        app(TenantContext::class)->set($this->tenant);

        $this->assertSame(0.0, app(ReportService::class)->collectedTotal($this->todayPeriod()));
    }

    public function test_active_guests_counts_participants_of_active_sessions_only(): void
    {
        $table = Table::factory()->create(['tenant_id' => $this->tenant->id, 'branch_id' => $this->branch->id]);

        $open = DiningSession::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'table_id' => $table->id,
            'status' => DiningSessionStatus::Open,
        ]);
        DiningParticipant::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'dining_session_id' => $open->id,
        ]);

        $closed = DiningSession::factory()->closed()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'table_id' => $table->id,
        ]);
        DiningParticipant::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'dining_session_id' => $closed->id,
        ]);

        $this->assertSame(3, app(DashboardAnalyticsService::class)->activeGuestsCount($this->tenant));
    }

    public function test_dashboard_defaults_to_today_and_returns_period_kpis(): void
    {
        $this->sellProduct();

        $this->actingAs($this->owner)
            ->get('/dashboard?preset=today')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('period.preset', 'today')
                ->has('analytics.kpis', 4)
                ->has('analytics.kpis_secondary', 4)
                ->has('business360.active_guests'));
    }

    public function test_dashboard_custom_range_sets_custom_preset(): void
    {
        $this->actingAs($this->owner)
            ->get('/dashboard?from=2026-10-01&to=2026-10-07')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('period.preset', 'custom')
                ->where('period.from', '2026-10-01')
                ->where('period.to', '2026-10-07'));
    }

    public function test_order_analytics_breaks_down_by_source_type_and_status(): void
    {
        $this->sellProduct();

        $stats = app(DashboardOverviewService::class)->build($this->tenant, $this->todayPeriod())['order_stats'];

        $this->assertSame(1, $stats['total']);
        $this->assertSame(1, $stats['completed']);
        $this->assertSame(0, $stats['voided']);
        $this->assertSame(1, $this->breakdownValue($stats['by_source'], 'POS'));
        $this->assertSame(1, $this->breakdownValue($stats['by_type'], 'Dine-in'));
    }

    public function test_branch_comparison_is_only_exposed_to_tenant_wide_users(): void
    {
        $this->sellProduct();

        $service = app(DashboardOverviewService::class);

        $this->assertNull($service->build($this->tenant, $this->todayPeriod(), false)['branches']);

        $branches = $service->build($this->tenant, $this->todayPeriod(), true)['branches'];
        $this->assertIsArray($branches);
        $this->assertSame($this->branch->name, $branches[0]['branch']);
        $this->assertSame(1, $branches[0]['orders']);
    }

    public function test_staff_performance_lists_the_cashier(): void
    {
        $this->sellProduct();

        $staff = app(DashboardOverviewService::class)->build($this->tenant, $this->todayPeriod())['staff'];

        $this->assertSame(1, $staff[0]['orders']);
        $this->assertSame(220.0, $staff[0]['sales']);
    }

    protected function breakdownValue(array $rows, string $label): ?int
    {
        foreach ($rows as $row) {
            if ($row['label'] === $label) {
                return $row['value'];
            }
        }

        return null;
    }
}
