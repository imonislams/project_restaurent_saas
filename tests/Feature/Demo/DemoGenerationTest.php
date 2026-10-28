<?php

namespace Tests\Feature\Demo;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Register;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\Models\Customer;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Invoicing\Models\Invoice;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Loyalty\Models\LoyaltyTransaction;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class DemoGenerationTest extends DemoTestCase
{
    public function test_it_generates_a_coherent_workspace(): void
    {
        [$tenant, $owner] = $this->tenantReadyForDemo();

        $batch = $this->runDemo($tenant, $owner, 2);

        $this->assertSame(DemoDataBatch::STATUS_COMPLETED, $batch->status);
        $this->assertCount($batch->steps_total, $batch->completed_steps ?? []);

        $scope = fn (string $model) => $model::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey());

        // Menu, team and guests.
        $this->assertGreaterThanOrEqual(45, $scope(Product::class)->count());
        $this->assertSame(2, $scope(Branch::class)->count(), 'the demo adds exactly one branch');
        $this->assertGreaterThanOrEqual(10, User::query()->where('tenant_id', $tenant->getKey())->count());
        $this->assertGreaterThanOrEqual(30, $scope(Customer::class)->count());

        // Two trading days of orders, none dated in the future.
        $orders = $scope(Order::class)->get();
        $this->assertGreaterThan(40, $orders->count());
        $this->assertSame(0, $orders->filter(fn (Order $order) => $order->placed_at->isFuture())->count());

        foreach ((array) $batch->ref('day_plan') as $date) {
            $this->assertGreaterThan(0, $orders->filter(
                fn (Order $order) => $order->placed_at->copy()->setTimezone('Asia/Dhaka')->toDateString() === $date,
            )->count(), "no orders were placed on {$date}");
        }

        // Every completed sale is paid in full, and payments agree with the orders.
        $completed = $orders->where('status', OrderStatus::Completed);
        $this->assertGreaterThan(0, $completed->count());

        foreach ($completed as $order) {
            $this->assertSame(
                round((float) $order->total, 2),
                round((float) $order->paid_total, 2),
                "order {$order->order_number} is not paid in full",
            );
        }

        $payments = (float) $scope(Payment::class)->where('status', 'succeeded')->sum('amount');
        $this->assertEqualsWithDelta($completed->sum(fn (Order $order) => (float) $order->paid_total), $payments, 0.01);

        // Stock stays on the right side of zero …
        $this->assertGreaterThan(0, $scope(StockBalance::class)->count());
        $this->assertSame(0, $scope(StockBalance::class)->where('quantity', '<', 0)->count());

        // … and every cached balance agrees with its own movement ledger. A
        // leftover balance being added to the opening figure (instead of being
        // reconciled to it) shows up here as drift.
        foreach ($scope(StockBalance::class)->get() as $balance) {
            $movements = (float) $scope(StockMovement::class)
                ->where('stock_location_id', $balance->stock_location_id)
                ->where('stockable_type', $balance->stockable_type)
                ->where('stockable_id', $balance->stockable_id)
                ->sum('quantity_delta');

            $this->assertEqualsWithDelta(
                (float) $balance->quantity,
                $movements,
                0.001,
                "balance drift for {$balance->stockable_type} #{$balance->stockable_id}",
            );
        }

        // Past shifts are closed at zero variance; the current day stays open.
        $closed = $scope(Shift::class)->where('status', 'closed')->get();
        $this->assertTrue($closed->isNotEmpty());
        $this->assertTrue($closed->every(fn ($shift) => (float) $shift->overage_shortage === 0.0));
        $this->assertGreaterThan(0, $scope(Shift::class)->where('status', 'open')->count());

        // Downstream records exist: kitchen, invoices, loyalty.
        $this->assertGreaterThan(0, $scope(KitchenTicket::class)->count());
        $this->assertGreaterThan(0, $scope(Invoice::class)->count());
        $this->assertGreaterThan(0, $scope(LoyaltyTransaction::class)->count());

        // Everything created is traced, and the run reports its totals.
        $this->assertGreaterThan(1000, DemoDataRecord::query()->where('batch_id', $batch->getKey())->count());
        $this->assertGreaterThan(0, (int) ($batch->counts['orders'] ?? 0));
        $this->assertSame(2, (int) ($batch->counts['days'] ?? 0));
        $this->assertSame('BDT', $batch->counts['currency'] ?? null);
    }

    public function test_generation_survives_a_live_shift_on_the_same_till(): void
    {
        [$tenant, $owner, $branch] = $this->tenantReadyForDemo();

        // Someone is using the system right now: an open shift on the till the
        // demo would otherwise pick. Back-dating a shift must not fight it.
        $register = Register::create([
            'tenant_id' => $tenant->getKey(),
            'branch_id' => $branch->getKey(),
            'name' => 'Till 1',
            'is_active' => true,
        ]);

        $live = Shift::create([
            'tenant_id' => $tenant->getKey(),
            'branch_id' => $branch->getKey(),
            'register_id' => $register->getKey(),
            'opened_by' => $owner->getKey(),
            'opening_float' => 100,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $batch = $this->runDemo($tenant, $owner, 1);

        $this->assertSame(DemoDataBatch::STATUS_COMPLETED, $batch->status);
        $this->assertSame('open', $live->fresh()->status, 'the live shift is never touched');
        $this->assertSame(100.0, (float) $live->fresh()->opening_float);
    }

    public function test_menu_images_are_published_to_the_public_disk(): void
    {
        if (! file_exists(public_path('storage'))) {
            $this->markTestSkipped('Requires the public storage link (php artisan storage:link).');
        }

        Storage::fake('public');

        [$tenant, $owner] = $this->tenantReadyForDemo();

        $this->runDemo($tenant, $owner, 1);

        $products = Product::query()->withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->get();
        $withImages = $products->whereNotNull('image_path');

        $this->assertGreaterThan(0, $products->count());
        $this->assertCount($products->count(), $withImages, 'every product should carry an illustration');
        $this->assertStringStartsWith('demo/menu/', (string) $withImages->first()->image_path);
        Storage::disk('public')->assertExists('demo/menu/curry.svg');
    }
}
