<?php

namespace Tests\Feature\Qr;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\OrderService;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\POS\SaleService;
use App\Domain\Tables\Enums\TableStatus;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class DiningFoundationTest extends TestCase
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
        $this->tenant->mergeSettings(['tax' => ['rate' => 0, 'inclusive' => false]]);
        $this->tenant->save();

        app(ProvisionInventoryDefaults::class)->forTenant($this->tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($this->tenant);

        $this->branch = Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create();
        $this->user->assignRole(RoleName::TenantOwner);

        app(TenantContext::class)->set($this->tenant);
        app(ShiftService::class)->open($this->branch, $this->user, 100);
    }

    protected function table(array $attributes = []): Table
    {
        return Table::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
        ], $attributes));
    }

    protected function qrToken(Table $table, array $attributes = []): TableQrToken
    {
        return TableQrToken::factory()->create(array_merge([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $table->branch_id,
            'table_id' => $table->id,
        ], $attributes));
    }

    public function test_table_qr_tokens_are_distinct_and_usable(): void
    {
        $table = $this->table();
        $a = $this->qrToken($table);
        $b = $this->qrToken($table);

        $this->assertNotSame($a->token, $b->token);
        $this->assertSame(64, strlen($a->token));
        $this->assertTrue($a->isUsable());
    }

    public function test_qr_context_resolves_the_tenant_and_branch(): void
    {
        $table = $this->table();
        $qr = $this->qrToken($table);

        Route::middleware(['web', 'qr.context'])->get('/__qr/{token}', fn () => response()->json([
            'tenant' => app(TenantContext::class)->tenantId(),
            'branch' => app(TenantContext::class)->branchId(),
            'table' => request()->attributes->get('qr_table')?->id,
        ]));

        $this->getJson("/__qr/{$qr->token}")
            ->assertOk()
            ->assertJson([
                'tenant' => $this->tenant->id,
                'branch' => $this->branch->id,
                'table' => $table->id,
            ]);

        $this->assertSame(1, $qr->fresh()->scan_count);
    }

    public function test_revoked_qr_token_is_rejected(): void
    {
        $table = $this->table();
        $qr = $this->qrToken($table, ['is_active' => false, 'revoked_at' => now()]);

        Route::middleware(['web', 'qr.context'])->get('/__qr/{token}', fn () => response()->json(['ok' => true]));

        $this->getJson("/__qr/{$qr->token}")->assertStatus(410);
    }

    public function test_qr_token_for_an_inactive_table_is_rejected(): void
    {
        $table = $this->table(['is_active' => false]);
        $qr = $this->qrToken($table);

        Route::middleware(['web', 'qr.context'])->get('/__qr/{token}', fn () => response()->json(['ok' => true]));

        $this->getJson("/__qr/{$qr->token}")->assertStatus(404);
    }

    public function test_qr_token_for_a_suspended_tenant_is_rejected(): void
    {
        $table = $this->table();
        $qr = $this->qrToken($table);
        $this->tenant->forceFill(['status' => 'suspended'])->save();

        Route::middleware(['web', 'qr.context'])->get('/__qr/{token}', fn () => response()->json(['ok' => true]));

        $this->getJson("/__qr/{$qr->token}")->assertStatus(404);
    }

    public function test_pos_orders_default_to_pos_source_and_auto_acceptance(): void
    {
        $order = $this->placeOrder();

        $this->assertSame(OrderSource::Pos, $order->source);
        $this->assertSame(AcceptanceStatus::AutoAccepted, $order->acceptance_status);
        $this->assertNull($order->dining_session_id);
    }

    public function test_voiding_an_order_releases_the_table_and_cancels_the_kitchen_ticket(): void
    {
        $table = $this->table();

        // A held (open tab) order occupies the table until it is voided/settled.
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Burger',
            'price_dine_in' => 100,
            'cost_price' => 40,
            'inventory_mode' => InventoryMode::None,
        ]);

        $order = app(SaleService::class)->openOrder([
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ], $this->user, $this->branch);

        $this->assertSame(TableStatus::Occupied, $table->fresh()->status);

        // Create the kitchen ticket synchronously (the queued job is deferred
        // inside the test transaction).
        app(KitchenService::class)->openTicketFor($order->fresh());

        app(ManagerPinService::class)->set($this->user, '1234');

        $voided = app(OrderService::class)->void($order->fresh(), $this->user, '1234');

        $this->assertSame('voided', $voided->status->value);
        $this->assertSame(TableStatus::Available, $table->fresh()->status);
        $this->assertSame(KitchenTicketStatus::Cancelled, $order->fresh()->kitchenTicket->status);
    }

    public function test_tenant_scope_hides_other_tenants_dining_sessions(): void
    {
        $mine = DiningSession::factory()->create(['tenant_id' => $this->tenant->id]);
        $other = Tenant::factory()->create();
        DiningSession::factory()->create(['tenant_id' => $other->id]);

        app(TenantContext::class)->set($this->tenant);

        $this->assertSame(1, DiningSession::count());
        $this->assertSame($mine->id, DiningSession::first()->id);
    }

    public function test_tenant_owner_has_qr_and_modifier_permissions(): void
    {
        $permissions = $this->user->allPermissions();

        $this->assertContains('qr.view', $permissions);
        $this->assertContains('qr.manage', $permissions);
        $this->assertContains('modifiers.manage', $permissions);
    }

    protected function placeOrder(?Table $table = null): Order
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Burger',
            'price_dine_in' => 100,
            'price_takeaway' => 100,
            'price_delivery' => 100,
            'cost_price' => 40,
            'inventory_mode' => InventoryMode::None,
        ]);

        $cash = PaymentMethod::query()->where('code', 'cash')->firstOrFail();

        return app(SaleService::class)->place([
            'branch_id' => $this->branch->id,
            'order_type' => 'dine_in',
            'table_id' => $table?->id,
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
            'payments' => [['payment_method_id' => $cash->id, 'amount' => 100, 'tendered' => 100]],
        ], $this->user, $this->branch);
    }
}
