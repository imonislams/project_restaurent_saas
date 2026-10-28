<?php

namespace Tests\Feature\Demo;

use App\Domain\Customers\Models\Customer;
use App\Domain\Demo\DemoDataService;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderSequence;

class DemoPurgeTest extends DemoTestCase
{
    public function test_purge_removes_the_demo_and_keeps_every_real_record(): void
    {
        [$tenant, $owner, $branch] = $this->tenantReadyForDemo();

        $batch = $this->runDemo($tenant, $owner, 1);

        $this->assertGreaterThan(0, Product::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count());
        $this->assertGreaterThan(0, DemoDataRecord::query()->where('batch_id', $batch->getKey())->count());

        // Created outside the demo, so it is not in the ledger.
        $realCustomer = Customer::create([
            'tenant_id' => $tenant->getKey(),
            'name' => 'Real Guest',
            'phone' => '+8801700009999',
            'is_active' => true,
        ]);

        $result = app(DemoDataService::class)->purge($tenant, $owner);

        $this->assertGreaterThan(0, $result['records']);
        $this->assertSame(0, DemoDataRecord::query()->where('tenant_id', $tenant->getKey())->count());

        // Demo content is gone.
        $this->assertSame(0, Product::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count());
        $this->assertSame(0, Category::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count());
        $this->assertSame(0, Order::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count());
        $this->assertSame(0, Customer::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->whereKeyNot($realCustomer->getKey())->count());

        // Numbering counters are NOT business records: resetting them would make
        // the next demo (or real sale) collide with existing order numbers.
        $this->assertGreaterThan(
            0,
            OrderSequence::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
            'the order-number counter must survive removal',
        );

        // The tenant's own records are not.
        $this->assertDatabaseHas('customers', ['id' => $realCustomer->getKey()]);
        $this->assertDatabaseHas('users', ['id' => $owner->getKey()]);
        $this->assertSame(1, $tenant->fresh()->branches()->count());
        $this->assertSame($branch->getKey(), $tenant->fresh()->branches()->value('id'));
        $this->assertNotNull($tenant->fresh()->subscription);
        $this->assertNotNull($tenant->fresh()->onboarding_completed_at);

        // The run is closed out and the removal is audited.
        $this->assertSame(DemoDataBatch::STATUS_REMOVED, $batch->fresh()->status);
        $this->assertNotNull($batch->fresh()->removed_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'demo.data_purged']);

        // Settings the demo applied are restored to their previous values.
        $this->assertFalse((bool) $tenant->fresh()->getSetting('loyalty.enabled'));
        $this->assertNull($tenant->fresh()->getSetting('waste.approval_threshold'));
    }

    public function test_purge_clears_a_pending_run_that_created_nothing(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();

        $batch = app(DemoDataService::class)->start($tenant, $owner);
        $this->assertSame(DemoDataBatch::STATUS_PENDING, $batch->status);

        $result = app(DemoDataService::class)->purge($tenant, $owner);

        $this->assertSame(0, $result['records']);
        $this->assertSame(DemoDataBatch::STATUS_REMOVED, $batch->fresh()->status);
    }

    /**
     * Regression: removal used to delete the order-number counter, so numbering
     * restarted at 0001 and a regenerated demo collided with a real order that
     * had kept its number (duplicate key on orders.branch_id + order_number).
     */
    public function test_numbering_continues_above_real_orders_after_removal(): void
    {
        [$tenant, $owner, $branch] = $this->tenantReadyForDemo();

        $this->runDemo($tenant, $owner, 1);

        $sequence = OrderSequence::query()->withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->where('branch_id', $branch->getKey())
            ->firstOrFail();

        $used = (int) $sequence->last_number;
        $this->assertGreaterThan(0, $used);

        app(DemoDataService::class)->purge($tenant, $owner);

        $this->assertSame($used, (int) $sequence->fresh()->last_number);

        // A real order keeps the next number, outside the demo ledger.
        $realNumber = ($branch->code ?: 'BR'.$branch->getKey()).'-'.now()->format('Ymd').'-'.str_pad((string) ($used + 1), 4, '0', STR_PAD_LEFT);

        Order::create([
            'tenant_id' => $tenant->getKey(),
            'branch_id' => $branch->getKey(),
            'user_id' => $owner->getKey(),
            'order_number' => $realNumber,
            'order_type' => 'counter',
            'status' => 'completed',
            'acceptance_status' => 'auto_accepted',
            'fulfillment_status' => 'served',
            'subtotal' => 100,
            'total' => 100,
            'paid_total' => 100,
            'currency' => 'BDT',
            'placed_at' => now(),
        ]);

        // A fresh run must complete instead of throwing a duplicate-key error.
        $batch = $this->runDemo($tenant, $owner, 1);

        $this->assertSame(DemoDataBatch::STATUS_COMPLETED, $batch->status);
        $this->assertDatabaseHas('orders', ['order_number' => $realNumber, 'tenant_id' => $tenant->getKey()]);
    }
}
