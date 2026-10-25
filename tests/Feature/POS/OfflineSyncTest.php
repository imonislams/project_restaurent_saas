<?php

namespace Tests\Feature\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\CashManagement\ShiftService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\POS\Models\OfflineSyncConflict;
use App\Domain\Tables\Models\Table;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflineSyncTest extends TestCase
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

    /** @return array<string, mixed> */
    protected function saleOperation(string $uuid, Product $product, int $quantity = 1, ?float $expectedTotal = null): array
    {
        $operation = [
            'uuid' => $uuid,
            'type' => 'place_sale',
            'captured_at' => now()->subMinutes(5)->toIso8601String(),
            'offline_reference' => 'OFF-'.strtoupper(substr($uuid, 0, 6)),
            'payload' => [
                'branch_id' => $this->branch->id,
                'order_type' => 'dine_in',
                'idempotency_key' => $uuid,
                'items' => [['product_id' => $product->id, 'quantity' => $quantity]],
                'payments' => [[
                    'payment_method_id' => $this->cashMethod()->id,
                    'amount' => 100 * $quantity,
                    'tendered' => 100 * $quantity,
                ]],
            ],
        ];

        if ($expectedTotal !== null) {
            $operation['expected_total'] = $expectedTotal;
        }

        return $operation;
    }

    /** @param list<array<string, mixed>> $operations */
    protected function sync(array $operations)
    {
        return $this->actingAs($this->user)->postJson('/pos/sync', ['operations' => $operations]);
    }

    public function test_the_offline_bundle_returns_the_catalogue_and_a_version(): void
    {
        $this->product();

        $this->actingAs($this->user)
            ->getJson('/pos/offline-bundle')
            ->assertOk()
            ->assertJsonPath('branch.id', $this->branch->id)
            ->assertJsonPath('shift.id', $this->shift->id)
            ->assertJsonStructure([
                'version',
                'generated_at',
                'data' => ['products', 'categories', 'paymentMethods', 'tables', 'customers', 'deliveryZones', 'taxRate', 'taxInclusive'],
            ])
            ->assertJsonCount(1, 'data.products');
    }

    public function test_the_bundle_version_changes_when_the_catalogue_changes(): void
    {
        $first = $this->actingAs($this->user)->getJson('/pos/offline-bundle')->json('version');

        $this->product(['name' => 'New dish']);

        $second = $this->actingAs($this->user)->getJson('/pos/offline-bundle')->json('version');

        $this->assertNotSame($first, $second);
    }

    public function test_the_bundle_carries_the_offline_authorisation_settings(): void
    {
        $this->tenant->mergeSettings(['pos' => ['discount_approval_percent' => 15]]);
        $this->tenant->save();

        config(['pos.offline.max_hours' => 8]);

        $bundle = $this->actingAs($this->user)->getJson('/pos/offline-bundle')->assertOk()->json('data');

        $this->assertSame(8, $bundle['offlineMaxHours']);
        $this->assertEqualsWithDelta(15.0, $bundle['discountApprovalPercent'], 0.001);
    }

    public function test_the_bundle_reports_no_approval_threshold_when_unset(): void
    {
        $this->actingAs($this->user)
            ->getJson('/pos/offline-bundle')
            ->assertOk()
            ->assertJsonPath('data.discountApprovalPercent', null);
    }

    public function test_a_captured_sale_is_applied_and_recorded_as_offline(): void
    {
        $product = $this->product();

        $this->sync([$this->saleOperation('11111111-1111-1111-1111-111111111111', $product)])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'accepted');

        $order = Order::firstOrFail();
        $this->assertSame('completed', $order->status->value);
        $this->assertSame(100.0, (float) $order->total);
        $this->assertSame('OFF-111111', $order->offline_reference);
        $this->assertNotNull($order->captured_offline_at);
        $this->assertNotNull($order->synced_at);
    }

    public function test_replaying_a_batch_never_creates_a_second_sale(): void
    {
        $product = $this->product();
        $operation = $this->saleOperation('22222222-2222-2222-2222-222222222222', $product);

        $first = $this->sync([$operation])->json('results.0');
        $second = $this->sync([$operation])->json('results.0');

        $this->assertSame('accepted', $first['status']);
        $this->assertSame('accepted', $second['status']);
        $this->assertSame($first['order_id'], $second['order_id']);
        $this->assertSame(1, Order::count());
    }

    public function test_one_bad_operation_does_not_discard_the_rest_of_the_batch(): void
    {
        $product = $this->product();

        $good = $this->saleOperation('33333333-3333-3333-3333-333333333333', $product);

        $bad = $this->saleOperation('44444444-4444-4444-4444-444444444444', $product);
        $bad['payload']['items'] = [['product_id' => 999999, 'quantity' => 1]];

        $this->sync([$good, $bad])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'accepted')
            ->assertJsonPath('results.1.status', 'rejected');

        $this->assertSame(1, Order::count());
    }

    public function test_an_order_opened_offline_can_be_settled_offline(): void
    {
        $product = $this->product();

        $opened = $this->sync([[
            'uuid' => '55555555-5555-5555-5555-555555555555',
            'type' => 'open_order',
            'captured_at' => now()->subMinutes(10)->toIso8601String(),
            'payload' => [
                'branch_id' => $this->branch->id,
                'order_type' => 'dine_in',
                'idempotency_key' => '55555555-5555-5555-5555-555555555555',
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ],
        ]])->json('results.0');

        $this->assertSame('accepted', $opened['status']);
        $this->assertSame('held', Order::findOrFail($opened['order_id'])->status->value);

        $this->sync([[
            'uuid' => '66666666-6666-6666-6666-666666666666',
            'type' => 'settle_order',
            'captured_at' => now()->toIso8601String(),
            'payload' => [
                'order_id' => $opened['order_id'],
                'payments' => [[
                    'payment_method_id' => $this->cashMethod()->id,
                    'amount' => 100,
                    'tendered' => 100,
                ]],
            ],
        ]])->assertJsonPath('results.0.status', 'accepted');

        $this->assertSame('completed', Order::findOrFail($opened['order_id'])->status->value);
    }

    public function test_sync_requires_the_pos_permission(): void
    {
        $product = $this->product();
        $stranger = User::factory()->forTenant($this->tenant)->create();

        $this->actingAs($stranger)
            ->postJson('/pos/sync', ['operations' => [$this->saleOperation('77777777-7777-7777-7777-777777777777', $product)]])
            ->assertForbidden();

        $this->actingAs($stranger)->getJson('/pos/offline-bundle')->assertForbidden();
        $this->assertSame(0, Order::count());
    }

    public function test_an_unknown_operation_type_is_rejected_by_validation(): void
    {
        $this->sync([[
            'uuid' => '88888888-8888-8888-8888-888888888888',
            'type' => 'drop_database',
            'payload' => [],
        ]])->assertStatus(422);
    }

    public function test_a_different_server_total_is_recorded_as_a_conflict(): void
    {
        $product = $this->product();

        $this->sync([$this->saleOperation('99999999-9999-9999-9999-999999999999', $product, expectedTotal: 90.0)])
            ->assertOk()
            ->assertJsonPath('results.0.status', 'conflicted');

        $order = Order::firstOrFail();

        // The server total is authoritative: the difference is flagged, not applied.
        $this->assertSame(100.0, (float) $order->total);

        $conflict = OfflineSyncConflict::firstOrFail();
        $this->assertSame(OfflineSyncConflict::TYPE_TOTAL_MISMATCH, $conflict->type);
        $this->assertSame('open', $conflict->status);
        $this->assertEqualsWithDelta(90.0, $conflict->expected['total'], 0.001);
        $this->assertEqualsWithDelta(100.0, $conflict->actual['total'], 0.001);
        $this->assertSame($order->getKey(), $conflict->order_id);
        $this->assertSame($this->tenant->id, $conflict->tenant_id);
    }

    public function test_a_matching_total_is_not_flagged(): void
    {
        $product = $this->product();

        $this->sync([$this->saleOperation('aaaaaaaa-0000-0000-0000-000000000001', $product, expectedTotal: 100.0)])
            ->assertJsonPath('results.0.status', 'accepted');

        $this->assertSame(0, OfflineSyncConflict::count());
    }

    public function test_a_rejected_operation_is_also_recorded_for_review(): void
    {
        $product = $this->product();

        $bad = $this->saleOperation('aaaaaaaa-0000-0000-0000-000000000002', $product);
        $bad['payload']['items'] = [['product_id' => 999999, 'quantity' => 1]];

        $this->sync([$bad])->assertJsonPath('results.0.status', 'rejected');

        $conflict = OfflineSyncConflict::firstOrFail();
        $this->assertSame('open', $conflict->status);
        $this->assertNotEmpty($conflict->message);
        $this->assertSame(0, Order::count());
    }

    public function test_a_sale_whose_table_was_taken_is_still_recorded(): void
    {
        $product = $this->product();

        $table = Table::factory()->create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'T1',
        ]);

        // Another device opened an order at that table while this one was offline.
        $this->sync([[
            'uuid' => 'aaaaaaaa-0000-0000-0000-000000000003',
            'type' => 'open_order',
            'captured_at' => now()->subMinutes(10)->toIso8601String(),
            'payload' => [
                'branch_id' => $this->branch->id,
                'order_type' => 'dine_in',
                'idempotency_key' => 'aaaaaaaa-0000-0000-0000-000000000003',
                'table_id' => $table->id,
                'items' => [['product_id' => $product->id, 'quantity' => 1]],
            ],
        ]])->assertJsonPath('results.0.status', 'accepted');

        $sale = $this->saleOperation('aaaaaaaa-0000-0000-0000-000000000004', $product);
        $sale['payload']['table_id'] = $table->id;

        $result = $this->sync([$sale])->assertOk()->json('results.0');

        $this->assertSame('conflicted', $result['status']);

        $conflict = OfflineSyncConflict::where('type', OfflineSyncConflict::TYPE_TABLE_OCCUPIED)->firstOrFail();
        $this->assertSame($result['order_id'], $conflict->order_id);

        // The sale survived; only its table binding was dropped.
        $order = Order::findOrFail($result['order_id']);
        $this->assertSame('completed', $order->status->value);
        $this->assertNull($order->table_id);
    }
}
