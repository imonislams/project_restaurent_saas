<?php

namespace Tests\Feature\Demo;

use App\Domain\Branches\BranchService;
use App\Domain\Branches\Models\Branch;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Orders\Models\Order;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;

class DemoUsageTest extends DemoTestCase
{
    public function test_demo_rows_never_count_towards_plan_usage(): void
    {
        [$tenant, $owner, $branch] = $this->tenantReadyForDemo();

        $plan = Plan::create([
            'slug' => 'limited-plan',
            'name' => 'Limited Plan',
            'description' => 'Test fixture with tight limits.',
            'price_monthly' => 0,
            'price_yearly' => 0,
            'trial_days' => 0,
            'features' => [],
            'limits' => ['branches' => 2, 'users' => 2, 'orders_this_month' => 5],
            'is_active' => true,
            'visibility' => 'hidden',
            'sort_order' => 1,
        ]);

        $tenant->subscription()->update(['plan_id' => $plan->getKey()]);
        Tenant::forgetEntitlementCache($tenant->getKey());

        $batch = DemoDataBatch::create([
            'tenant_id' => $tenant->getKey(),
            'status' => DemoDataBatch::STATUS_COMPLETED,
            'days' => 15,
            'steps_total' => 1,
            'steps_done' => 1,
            'started_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
        ]);

        $trace = function (object $model) use ($batch, $tenant): void {
            DemoDataRecord::create([
                'batch_id' => $batch->getKey(),
                'tenant_id' => $tenant->getKey(),
                'model_type' => $model->getMorphClass(),
                'model_id' => $model->getKey(),
                'created_at' => now(),
            ]);
        };

        // Demo content beyond every limit.
        $demoBranch = Branch::create([
            'tenant_id' => $tenant->getKey(),
            'name' => 'Demo Annex',
            'code' => 'BR-02',
            'is_active' => true,
            'is_primary' => false,
        ]);
        $trace($demoBranch);

        $demoUser = User::factory()->forTenant($tenant)->create();
        $trace($demoUser);

        foreach (range(1, 6) as $index) {
            $order = Order::create([
                'tenant_id' => $tenant->getKey(),
                'branch_id' => $branch->getKey(),
                'user_id' => $owner->getKey(),
                'order_number' => 'DEMO-'.$index,
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
            $trace($order);
        }

        // One real order, so usage is not simply zero.
        Order::create([
            'tenant_id' => $tenant->getKey(),
            'branch_id' => $branch->getKey(),
            'user_id' => $owner->getKey(),
            'order_number' => 'REAL-1',
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

        $usage = app(UsageService::class)->metrics($tenant);

        $this->assertSame(1, $usage['branches'], 'the demo branch must not count');
        $this->assertSame(1, $usage['users'], 'demo staff must not count');
        $this->assertSame(1, $usage['orders_this_month'], 'demo orders must not count');

        // With the demo branch present the tenant is still inside its 2-branch
        // allowance, so adding another real branch must not be refused.
        app(BranchService::class)->assertWithinLimit($tenant);
        $this->assertTrue(true, 'the branch limit check passed');
    }
}
