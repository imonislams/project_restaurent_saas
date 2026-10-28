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
        $this->assertSame(0, OrderSequence::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count());

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
}
