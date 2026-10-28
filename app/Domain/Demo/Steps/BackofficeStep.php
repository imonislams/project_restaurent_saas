<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Accounting\Enums\ExpenseStatus;
use App\Domain\Accounting\ExpenseService;
use App\Domain\Accounting\Models\Expense;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Customers\Models\Customer;
use App\Domain\Demo\Data\DemoProfile;
use App\Domain\Demo\DemoClock;
use App\Domain\Demo\DemoRun;
use App\Domain\Inventory\Enums\TransferStatus;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockTransfer;
use App\Domain\Inventory\StockService;
use App\Domain\Inventory\TransferService;
use App\Domain\Loyalty\LoyaltyService;
use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Loyalty\Models\LoyaltyTransaction;
use App\Domain\Purchasing\Enums\PurchaseOrderStatus;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Purchasing\PurchasingService;
use App\Domain\Waste\Models\WasteRecord;
use App\Domain\Waste\WasteService;
use Carbon\Carbon;

/**
 * The back office: purchase orders received into stock, supplier payments,
 * waste (including records waiting for approval), expenses posted to the
 * account ledger, a stock transfer between branches, deliberately low stock so
 * the low-stock alerts are real, and loyalty redemptions.
 */
class BackofficeStep implements DemoStep
{
    /** Realistic purchase-order remarks, cycled across the plan. */
    protected const PURCHASE_NOTES = [
        'Weekly dry store order',
        'Fresh produce order',
        'Meat & poultry order',
        'Dairy and chilled order',
        'Pantry top-up order',
        'Standing weekly order',
    ];

    public function key(): string
    {
        return 'backoffice';
    }

    public function label(): string
    {
        return 'Purchasing, waste & expenses';
    }

    public function run(DemoRun $run): array
    {
        $profile = $run->profile();
        $timezone = (string) ($run->tenant()->getSetting('region.timezone') ?? config('app.timezone'));
        $today = now($timezone)->startOfDay();

        $counters = [
            'purchases' => $this->purchaseOrders($run, $profile, $today),
            'waste' => $this->waste($run, $profile, $today),
            'expenses' => $this->expenses($run, $profile, $today),
            'transfers' => $this->transfers($run, $today),
            'loyalty_redemptions' => $this->loyaltyRedemptions($run, $profile, $today),
        ];

        $this->lowStock($run, $profile, $today);

        return $counters;
    }

    protected function purchaseOrders(DemoRun $run, DemoProfile $profile, Carbon $today): int
    {
        $purchasing = app(PurchasingService::class);
        $stock = app(StockService::class);
        $inventory = $run->user('inventory');
        $accountant = $run->user('accountant');
        $primary = $run->branch('primary');
        $catalog = $profile->ingredients();
        $count = 0;

        foreach ($profile->purchasePlan() as $index => $plan) {
            $supplierId = $run->ref('suppliers.'.$plan['supplier']);

            if (! $supplierId) {
                continue;
            }

            $at = $this->moment($today, $plan['day'], 10, 0);

            $items = [];

            foreach ($plan['items'] as $line) {
                $ingredientId = $run->ref('ingredients.'.$line['ingredient']);

                if (! $ingredientId) {
                    continue;
                }

                $items[] = [
                    'item_type' => 'ingredient',
                    'item_id' => (int) $ingredientId,
                    'quantity' => (float) $line['quantity'],
                    'unit_cost' => (float) ($catalog[$line['ingredient']]['cost'] ?? 0),
                ];
            }

            if ($items === []) {
                continue;
            }

            // Located by supplier + the day it was raised, so no marker text has
            // to leak into a field the owner reads.
            $order = PurchaseOrder::query()->withoutGlobalScopes()
                ->where('tenant_id', $run->batch->tenant_id)
                ->where('supplier_id', (int) $supplierId)
                ->whereBetween('created_at', $this->dayWindow($at))
                ->first();

            if (! $order) {
                $order = DemoClock::at($at, fn () => $purchasing->create([
                    'supplier_id' => (int) $supplierId,
                    'branch_id' => $primary->getKey(),
                    'notes' => self::PURCHASE_NOTES[$index % count(self::PURCHASE_NOTES)],
                    'items' => $items,
                ], $inventory));
            }

            $count++;

            if ($plan['state'] === 'draft') {
                continue;
            }

            // Each transition is guarded by the current status, so a retry of
            // the step never re-submits or re-receives an order.
            if ($order->status === PurchaseOrderStatus::Draft) {
                DemoClock::at($at->copy()->addHours(2), fn () => $purchasing->submit($order, $inventory));
            }

            $order->refresh();

            // Everything past draft is approved; only the received states book
            // goods in (an order waiting for delivery stays approved).
            $receivable = in_array($plan['state'], ['received', 'partially_received'], true);
            $approved = in_array($plan['state'], ['approved', 'received', 'partially_received'], true);

            if ($approved && $order->status === PurchaseOrderStatus::Submitted) {
                DemoClock::at($at->copy()->addHours(5), fn () => $purchasing->approve($order, $inventory));
                $order->refresh();
            }

            if ($receivable && $order->status === PurchaseOrderStatus::Approved) {
                $fraction = $plan['state'] === 'partially_received' ? 0.6 : 1.0;

                $lines = $order->items()->get()->map(fn ($item) => [
                    'purchase_order_item_id' => $item->getKey(),
                    'quantity' => round((float) $item->quantity * $fraction, 3),
                ])->all();

                DemoClock::at($at->copy()->addDays(2), fn () => $purchasing->receive($order, $lines, $inventory));
                $order->refresh();
            }

            if ($order->status === PurchaseOrderStatus::Received && ! $order->payments()->exists()) {
                $supplier = Supplier::query()->withoutGlobalScopes()->find($order->supplier_id);

                if ($supplier) {
                    DemoClock::at($at->copy()->addDays(4), fn () => $purchasing->recordPayment($supplier, [
                        'amount' => round((float) $order->total, 2),
                        'method' => 'bank_transfer',
                        'reference' => 'BEFTN-'.$order->number,
                        'notes' => 'Settled against '.$order->number,
                    ], $accountant, $order));
                }
            }
        }

        return $count;
    }

    protected function waste(DemoRun $run, DemoProfile $profile, Carbon $today): int
    {
        $waste = app(WasteService::class);
        $inventory = $run->user('inventory');
        $primary = $run->branch('primary');
        $count = 0;

        foreach ($profile->wastePlan() as $index => $plan) {
            $ingredientId = $run->ref('ingredients.'.$plan['item']);

            if (! $ingredientId) {
                continue;
            }

            $at = $today->copy()->subDays(2 + $index)->setTime(16, 30);

            $record = WasteRecord::query()->withoutGlobalScopes()
                ->where('tenant_id', $run->batch->tenant_id)
                ->where('item_id', (int) $ingredientId)
                ->where('notes', $plan['note'])
                ->first();

            if (! $record) {
                $record = DemoClock::at($at, fn () => $waste->record([
                    'item_type' => 'ingredient',
                    'item_id' => (int) $ingredientId,
                    'branch_id' => $primary->getKey(),
                    'quantity' => (float) $plan['quantity'],
                    'reason' => $plan['reason'],
                    'notes' => $plan['note'],
                ], $inventory));
            }

            $count++;

            // Records above the approval threshold stay pending on purpose:
            // they are the ones waiting for a manager.
        }

        return $count;
    }

    protected function expenses(DemoRun $run, DemoProfile $profile, Carbon $today): int
    {
        $expenses = app(ExpenseService::class);
        $accountant = $run->user('accountant');
        $owner = $run->user('manager');
        $primary = $run->branch('primary');
        $cashAccount = $run->cashAccount($primary);
        $bankAccount = FinancialAccount::query()->withoutGlobalScopes()
            ->where('tenant_id', $run->batch->tenant_id)
            ->where('type', 'bank')
            ->first();

        $plan = $profile->expenses();
        $count = 0;

        foreach ($plan as $index => $line) {
            $date = $this->moment($today, $line['day'], 12, 0);
            $categoryId = $run->ref('expense_categories.'.$line['category']);

            $expense = Expense::query()->withoutGlobalScopes()
                ->where('tenant_id', $run->batch->tenant_id)
                ->where('description', $line['description'])
                ->first();

            if (! $expense) {
                $account = in_array($line['method'], ['bank_transfer', 'card'], true) && $bankAccount
                    ? $bankAccount
                    : $cashAccount;

                $expense = DemoClock::at($date, fn () => $expenses->create([
                    'amount' => (float) $line['amount'],
                    'description' => $line['description'],
                    'branch_id' => $primary->getKey(),
                    'expense_category_id' => $categoryId ? (int) $categoryId : null,
                    'financial_account_id' => $account->getKey(),
                    'expense_date' => $date->toDateString(),
                    'payment_method' => $line['method'],
                ], $accountant));
            }

            $count++;

            // Leave the two most recent expenses awaiting approval.
            if ($expense->status === ExpenseStatus::Submitted && $index >= 2) {
                DemoClock::at($date->copy()->addDay(), fn () => $expenses->approve($expense, $owner));
            }
        }

        return $count;
    }

    protected function transfers(DemoRun $run, Carbon $today): int
    {
        $transfers = app(TransferService::class);
        $inventory = $run->user('inventory');
        $primary = $run->branch('primary');
        $annex = $run->branch('annex');

        $plan = [
            ['ingredient' => 'onion', 'quantity' => 8.0, 'receive' => true, 'day' => '-6', 'notes' => 'Weekend stock top-up'],
            ['ingredient' => 'potato', 'quantity' => 6.0, 'receive' => false, 'day' => '-1', 'notes' => 'Annex kitchen restock'],
        ];

        $count = 0;

        foreach ($plan as $index => $line) {
            $ingredientId = $run->ref('ingredients.'.$line['ingredient']);

            if (! $ingredientId) {
                continue;
            }

            $at = $this->moment($today, $line['day'], 9, 0);

            $transfer = StockTransfer::query()->withoutGlobalScopes()
                ->where('tenant_id', $run->batch->tenant_id)
                ->where('from_branch_id', $primary->getKey())
                ->where('to_branch_id', $annex->getKey())
                ->whereBetween('created_at', $this->dayWindow($at))
                ->first();

            if (! $transfer) {
                $transfer = DemoClock::at($at, fn () => $transfers->create([
                    'from_branch_id' => $primary->getKey(),
                    'to_branch_id' => $annex->getKey(),
                    'notes' => $line['notes'],
                    'items' => [[
                        'item_type' => 'ingredient',
                        'item_id' => (int) $ingredientId,
                        'quantity' => $line['quantity'],
                    ]],
                ], $inventory));
            }

            $count++;

            if ($line['receive'] && $transfer->status === TransferStatus::Draft) {
                DemoClock::at($at->copy()->addHours(1), fn () => $transfers->approve($transfer, $inventory));
                DemoClock::at($at->copy()->addHours(3), fn () => $transfers->dispatch($transfer->fresh(), $inventory));
                DemoClock::at($at->copy()->addHours(6), fn () => $transfers->receive($transfer->fresh(), $inventory));
            }
        }

        return $count;
    }

    /**
     * Drive a handful of items below the low-stock threshold so the low-stock
     * report, dashboard badge and alerts are showing real data.
     */
    protected function lowStock(DemoRun $run, DemoProfile $profile, Carbon $today): void
    {
        $stock = app(StockService::class);
        $primary = $run->branch('primary');
        $location = $run->location($primary);
        $threshold = $profile->lowStockThreshold();

        $targets = $profile->isBangladeshi()
            ? ['basmati_rice' => 6.0, 'soybean_oil' => 4.0, 'chicken' => 5.0]
            : ['pasta' => 3.0, 'olive_oil' => 2.5, 'chicken_breast' => 3.0];

        foreach ($targets as $key => $quantity) {
            $ingredientId = $run->ref('ingredients.'.$key);

            if (! $ingredientId) {
                continue;
            }

            $ingredient = Ingredient::query()->withoutGlobalScopes()->find((int) $ingredientId);

            if (! $ingredient || $stock->balanceFor($ingredient, $location) <= $threshold) {
                continue;
            }

            DemoClock::at($today->copy()->subHours(3), fn () => $stock->adjustTo(
                $ingredient,
                $location,
                $quantity,
                'Stock count — below reorder level',
            ));
        }
    }

    /**
     * A few members spend points (only once — a retry must not redeem twice).
     */
    protected function loyaltyRedemptions(DemoRun $run, DemoProfile $profile, Carbon $today): int
    {
        $loyalty = app(LoyaltyService::class);
        $staff = $run->user('manager');
        $count = 0;

        if (LoyaltyTransaction::query()->withoutGlobalScopes()
            ->where('tenant_id', $run->batch->tenant_id)
            ->where('type', 'redeem')
            ->exists()) {
            return 0;
        }

        $accounts = LoyaltyAccount::query()->withoutGlobalScopes()
            ->where('tenant_id', $run->batch->tenant_id)
            ->where('points_balance', '>=', 200)
            ->orderByDesc('points_balance')
            ->limit(2)
            ->get();

        foreach ($accounts as $account) {
            $customer = Customer::query()->withoutGlobalScopes()->find($account->customer_id);

            if (! $customer) {
                continue;
            }

            DemoClock::at($today->copy()->subDay()->setTime(20, 15), function () use ($loyalty, $customer, $staff) {
                $loyalty->redeem($customer, 100, null, $staff);
            });

            $count++;
        }

        return $count;
    }

    protected function moment(Carbon $today, string $offset, int $hour, int $minute): Carbon
    {
        $days = (int) str_replace('+', '', $offset);

        return $today->copy()->addDays($days)->setTime($hour, $minute);
    }

    /**
     * The UTC bounds of the local day a moment falls in — used to find records
     * a previous (or retried) run already created.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    protected function dayWindow(Carbon $moment): array
    {
        return [
            $moment->copy()->startOfDay()->utc(),
            $moment->copy()->endOfDay()->utc(),
        ];
    }
}
