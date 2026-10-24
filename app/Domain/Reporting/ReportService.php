<?php

namespace App\Domain\Reporting;

use App\Domain\Accounting\Models\Expense;
use App\Domain\CashManagement\Models\CashMovement;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\CustomerSegmentationService;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Loyalty\Models\LoyaltyTransaction;
use App\Domain\Menu\Models\Product;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Models\Payment;
use App\Domain\Purchasing\Models\GoodsReceiptItem;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Tenancy\TenantContext;
use App\Domain\Waste\Models\WasteRecord;
use Illuminate\Support\Collection;

/**
 * Read-only analytics. Every figure is derived from the same records the
 * operational modules write, and money is reported excluding tax unless stated.
 *
 * Definitions:
 *  - Gross sales   = Σ order line totals (subtotal)
 *  - Discounts     = Σ discount totals (line + order)
 *  - Net sales     = Σ (order total − tax)   → revenue excluding tax
 *  - COGS          = Σ (order item unit cost × quantity) — immutable snapshots
 *  - Gross profit  = Net sales − COGS
 *  - Net operating = Gross profit − approved operating expenses
 */
class ReportService
{
    public function sales(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->get(['id', 'placed_at', 'subtotal', 'discount_total', 'tax_total', 'service_charge', 'total']);
        $metrics = $this->metricsFrom($orders, $period);

        $byDay = [];
        foreach ($period->localDates() as $date) {
            $byDay[$date] = ['orders' => 0, 'net' => 0.0, 'total' => 0.0];
        }
        foreach ($orders as $order) {
            $date = $period->localDate($order->placed_at);
            if (! isset($byDay[$date])) {
                continue;
            }
            $byDay[$date]['orders']++;
            $byDay[$date]['total'] += (float) $order->total;
            $byDay[$date]['net'] += (float) $order->total - (float) $order->tax_total;
        }

        $rows = array_map(
            fn ($date, $v) => ['date' => $date, 'orders' => $v['orders'], 'net' => round($v['net'], 2), 'total' => round($v['total'], 2)],
            array_keys($byDay),
            $byDay,
        );

        return [
            'summary' => [
                ['label' => 'Gross sales', 'value' => $metrics['gross'], 'format' => 'money'],
                ['label' => 'Discounts', 'value' => $metrics['discounts'], 'format' => 'money'],
                ['label' => 'Net sales (excl. tax)', 'value' => $metrics['net'], 'format' => 'money'],
                ['label' => 'Tax collected', 'value' => $metrics['tax'], 'format' => 'money'],
                ['label' => 'Service charge', 'value' => $metrics['service_charge'], 'format' => 'money'],
                ['label' => 'Refunds (voids)', 'value' => $metrics['refunds'], 'format' => 'money'],
                ['label' => 'Orders', 'value' => $metrics['orders'], 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'orders', 'label' => 'Orders', 'align' => 'right', 'format' => 'number'],
                ['key' => 'net', 'label' => 'Net sales', 'align' => 'right', 'format' => 'money'],
                ['key' => 'total', 'label' => 'Total', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
            'chart' => array_map(fn ($r) => ['label' => $r['date'], 'value' => $r['total']], $rows),
        ];
    }

    /**
     * Raw sales metrics for a period — the single source of truth shared by the
     * sales report and the dashboard KPI cards.
     *
     * @return array{gross: float, discounts: float, net: float, tax: float, service_charge: float, refunds: float, orders: int, average_ticket: float}
     */
    public function salesMetrics(ReportPeriod $period): array
    {
        return $this->metricsFrom(
            $this->completedOrders($period)->get(['id', 'placed_at', 'subtotal', 'discount_total', 'tax_total', 'service_charge', 'total']),
            $period,
        );
    }

    /** @return array{gross: float, discounts: float, net: float, tax: float, service_charge: float, refunds: float, orders: int, average_ticket: float} */
    protected function metricsFrom(Collection $orders, ReportPeriod $period): array
    {
        $total = (float) $orders->sum('total');
        $tax = (float) $orders->sum('tax_total');
        $net = round($total - $tax, 2);
        $count = $orders->count();

        return [
            'gross' => round((float) $orders->sum('subtotal'), 2),
            'discounts' => round((float) $orders->sum('discount_total'), 2),
            'net' => $net,
            'tax' => round($tax, 2),
            'service_charge' => round((float) $orders->sum('service_charge'), 2),
            'refunds' => round((float) $this->voidedOrders($period)->sum('total'), 2),
            'orders' => $count,
            'average_ticket' => $count > 0 ? round($net / $count, 2) : 0.0,
        ];
    }

    /**
     * Payments actually collected in the period (cash basis) — keyed to the
     * payment's own paid_at and limited to successful payments. This is
     * deliberately distinct from sales, which follow the order's placed date.
     */
    public function collectedTotal(ReportPeriod $period): float
    {
        return round((float) $this->collectedQuery($period)->sum('amount'), 2);
    }

    public function collected(ReportPeriod $period): array
    {
        $payments = $this->collectedQuery($period)->with('method:id,name')->get(['payment_method_id', 'amount']);

        $rows = $payments
            ->groupBy(fn (Payment $payment) => $payment->method?->name ?? 'Unknown')
            ->map(fn (Collection $group, string $method) => [
                'method' => $method,
                'count' => $group->count(),
                'amount' => round((float) $group->sum('amount'), 2),
            ])
            ->sortByDesc('amount')
            ->values();

        return [
            'summary' => [
                ['label' => 'Payments', 'value' => $payments->count(), 'format' => 'number'],
                ['label' => 'Collected', 'value' => round((float) $payments->sum('amount'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'method', 'label' => 'Method'],
                ['key' => 'count', 'label' => 'Count', 'align' => 'right', 'format' => 'number'],
                ['key' => 'amount', 'label' => 'Amount', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows->all(),
            'chart' => $rows->map(fn ($r) => ['label' => $r['method'], 'value' => $r['amount']])->all(),
        ];
    }

    protected function collectedQuery(ReportPeriod $period)
    {
        return Payment::query()
            ->where('status', PaymentStatus::Succeeded->value)
            ->whereBetween('paid_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->whereHas('order', fn ($o) => $o->where('branch_id', $period->branchId)));
    }

    /**
     * Net sales (excluding tax) bucketed by tenant-local hour for a single-day
     * window, or by day otherwise. Drives the dashboard sales trend.
     *
     * @return array<int, array{label: string, value: float}>
     */
    public function netTrend(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->get(['placed_at', 'total', 'tax_total']);
        $value = fn (Order $order) => (float) $order->total - (float) $order->tax_total;

        if ($period->from->isSameDay($period->to)) {
            $buckets = [];
            for ($hour = 0; $hour < 24; $hour++) {
                $buckets[sprintf('%02d:00', $hour)] = 0.0;
            }
            foreach ($orders as $order) {
                $hour = (int) $order->placed_at->copy()->setTimezone($period->timezone)->format('G');
                $buckets[sprintf('%02d:00', $hour)] += $value($order);
            }
        } else {
            $buckets = [];
            foreach ($period->localDates() as $date) {
                $buckets[$date] = 0.0;
            }
            foreach ($orders as $order) {
                $key = $period->localDate($order->placed_at);
                if (isset($buckets[$key])) {
                    $buckets[$key] += $value($order);
                }
            }
        }

        return array_map(
            fn ($label, $amount) => ['label' => (string) $label, 'value' => round((float) $amount, 2)],
            array_keys($buckets),
            array_values($buckets),
        );
    }

    /**
     * Order analytics for the period: volumes plus breakdowns by source, type
     * and fulfilment. Counts every order placed in the window (all statuses),
     * so this is operational volume rather than booked revenue.
     *
     * @return array{total: int, completed: int, voided: int, by_source: array, by_type: array, by_fulfillment: array}
     */
    public function orders(ReportPeriod $period): array
    {
        $orders = Order::query()
            ->whereBetween('placed_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->get(['id', 'placed_at', 'status', 'source', 'order_type', 'fulfillment_status']);

        return [
            'total' => $orders->count(),
            'completed' => $orders->filter(fn (Order $order) => $order->status === OrderStatus::Completed)->count(),
            'voided' => $orders->filter(fn (Order $order) => $order->status === OrderStatus::Voided)->count(),
            'by_source' => $this->breakdown($orders, fn (Order $order) => $order->source?->label() ?? 'Unknown'),
            'by_type' => $this->breakdown($orders, fn (Order $order) => $order->order_type?->label() ?? 'Unknown'),
            'by_fulfillment' => $this->breakdown($orders, fn (Order $order) => $order->fulfillment_status?->label() ?? 'Unknown'),
        ];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @param  callable(Order): string  $key
     * @return array<int, array{label: string, value: int}>
     */
    protected function breakdown(Collection $orders, callable $key): array
    {
        return $orders
            ->groupBy($key)
            ->map(fn (Collection $group, string $label) => ['label' => $label, 'value' => $group->count()])
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    public function products(ReportPeriod $period): array
    {
        $items = $this->completedItems($period)->get(['name', 'quantity', 'unit_cost', 'line_total']);

        $rows = $items
            ->groupBy('name')
            ->map(fn (Collection $group, string $name) => [
                'product' => $name,
                'qty' => round((float) $group->sum('quantity'), 3),
                'revenue' => round((float) $group->sum('line_total'), 2),
                'cogs' => round($group->sum(fn ($i) => (float) $i->unit_cost * (float) $i->quantity), 2),
            ])
            ->map(fn ($r) => $r + ['margin' => round($r['revenue'] - $r['cogs'], 2)])
            ->sortByDesc('revenue')
            ->values();

        $soldNames = $rows->pluck('product');
        $unsold = Product::query()->where('is_active', true)->get(['name'])
            ->filter(fn (Product $product) => ! $soldNames->contains($product->name))
            ->count();

        return [
            'summary' => [
                ['label' => 'Products sold', 'value' => $rows->count(), 'format' => 'number'],
                ['label' => 'Units sold', 'value' => round((float) $items->sum('quantity'), 3), 'format' => 'number'],
                ['label' => 'Revenue', 'value' => round((float) $items->sum('line_total'), 2), 'format' => 'money'],
                ['label' => 'Active items with no sales', 'value' => $unsold, 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'product', 'label' => 'Product'],
                ['key' => 'qty', 'label' => 'Qty', 'align' => 'right', 'format' => 'number'],
                ['key' => 'revenue', 'label' => 'Revenue', 'align' => 'right', 'format' => 'money'],
                ['key' => 'cogs', 'label' => 'COGS', 'align' => 'right', 'format' => 'money'],
                ['key' => 'margin', 'label' => 'Margin', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows->take(50)->all(),
            'chart' => $rows->take(8)->map(fn ($r) => ['label' => $r['product'], 'value' => $r['revenue']])->all(),
        ];
    }

    public function categories(ReportPeriod $period): array
    {
        $items = $this->completedItems($period)->with('product.category')->get(['name', 'product_id', 'quantity', 'line_total']);

        $rows = $items
            ->groupBy(fn (OrderItem $item) => $item->product?->category?->name ?? 'Uncategorised')
            ->map(fn (Collection $group, string $category) => [
                'category' => $category,
                'qty' => round((float) $group->sum('quantity'), 3),
                'revenue' => round((float) $group->sum('line_total'), 2),
            ])
            ->sortByDesc('revenue')
            ->values();

        return [
            'summary' => [
                ['label' => 'Categories', 'value' => $rows->count(), 'format' => 'number'],
                ['label' => 'Revenue', 'value' => round((float) $items->sum('line_total'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'qty', 'label' => 'Qty', 'align' => 'right', 'format' => 'number'],
                ['key' => 'revenue', 'label' => 'Revenue', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows->all(),
            'chart' => $rows->map(fn ($r) => ['label' => $r['category'], 'value' => $r['revenue']])->all(),
        ];
    }

    public function payments(ReportPeriod $period): array
    {
        $payments = Payment::query()
            ->whereHas('order', fn ($q) => $q->where('status', 'completed')->whereBetween('placed_at', [$period->utcStart(), $period->utcEnd()])
                ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId)))
            ->with('method:id,name')
            ->get(['payment_method_id', 'amount']);

        $rows = $payments
            ->groupBy(fn (Payment $payment) => $payment->method?->name ?? 'Unknown')
            ->map(fn (Collection $group, string $method) => [
                'method' => $method,
                'count' => $group->count(),
                'amount' => round((float) $group->sum('amount'), 2),
            ])
            ->sortByDesc('amount')
            ->values();

        return [
            'summary' => [
                ['label' => 'Payments', 'value' => $payments->count(), 'format' => 'number'],
                ['label' => 'Collected', 'value' => round((float) $payments->sum('amount'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'method', 'label' => 'Method'],
                ['key' => 'count', 'label' => 'Count', 'align' => 'right', 'format' => 'number'],
                ['key' => 'amount', 'label' => 'Amount', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows->all(),
            'chart' => $rows->map(fn ($r) => ['label' => $r['method'], 'value' => $r['amount']])->all(),
        ];
    }

    public function cash(ReportPeriod $period): array
    {
        $shifts = Shift::query()
            ->whereBetween('opened_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->orderBy('opened_at')
            ->get();

        $movements = CashMovement::query()->whereIn('shift_id', $shifts->pluck('id'))->get(['type', 'amount']);
        $byType = $movements->groupBy(fn ($m) => $m->type->value)->map(fn ($g) => round((float) $g->sum('amount'), 2));

        $rows = $shifts->map(fn (Shift $shift) => [
            'opened_at' => $shift->opened_at?->toIso8601String(),
            'status' => $shift->status,
            'opening_float' => (float) $shift->opening_float,
            'expected' => $shift->expected_cash !== null ? (float) $shift->expected_cash : $shift->currentExpectedCash(),
            'counted' => $shift->counted_cash !== null ? (float) $shift->counted_cash : null,
            'variance' => $shift->overage_shortage !== null ? (float) $shift->overage_shortage : null,
        ])->all();

        return [
            'summary' => [
                ['label' => 'Shifts', 'value' => $shifts->count(), 'format' => 'number'],
                ['label' => 'Cash sales', 'value' => $byType['sale'] ?? 0, 'format' => 'money'],
                ['label' => 'Cash in', 'value' => $byType['cash_in'] ?? 0, 'format' => 'money'],
                ['label' => 'Cash out', 'value' => $byType['cash_out'] ?? 0, 'format' => 'money'],
                ['label' => 'Refunds', 'value' => $byType['refund'] ?? 0, 'format' => 'money'],
                ['label' => 'Variance (closed)', 'value' => round((float) $shifts->sum('overage_shortage'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'opened_at', 'label' => 'Opened', 'format' => 'datetime'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'opening_float', 'label' => 'Float', 'align' => 'right', 'format' => 'money'],
                ['key' => 'expected', 'label' => 'Expected', 'align' => 'right', 'format' => 'money'],
                ['key' => 'counted', 'label' => 'Counted', 'align' => 'right', 'format' => 'money'],
                ['key' => 'variance', 'label' => 'Variance', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
        ];
    }

    public function inventory(ReportPeriod $period): array
    {
        $balances = StockBalance::query()->with(['stockable', 'branch:id,name', 'stockLocation:id,name'])->get();

        $rows = [];
        $totalValue = 0.0;
        foreach ($balances as $balance) {
            $item = $balance->stockable;
            $unitCost = match (true) {
                $item instanceof Ingredient => (float) $item->cost_per_unit,
                $item instanceof Product => (float) $item->cost_price,
                default => 0.0,
            };
            $value = round($unitCost * (float) $balance->quantity, 2);
            $totalValue += $value;

            $rows[] = [
                'item' => $item?->name ?? 'Unknown',
                'type' => $balance->stockable_type,
                'branch' => $balance->branch?->name,
                'location' => $balance->stockLocation?->name,
                'quantity' => (float) $balance->quantity,
                'unit_cost' => $unitCost,
                'value' => $value,
            ];
        }

        $movements = StockMovement::query()
            ->whereBetween('created_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->get(['reason']);

        return [
            'summary' => [
                ['label' => 'Stock items', 'value' => count($rows), 'format' => 'number'],
                ['label' => 'Total value', 'value' => round($totalValue, 2), 'format' => 'money'],
                ['label' => 'Out of stock', 'value' => collect($rows)->where('quantity', '<=', 0)->count(), 'format' => 'number'],
                ['label' => 'Movements', 'value' => $movements->count(), 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'item', 'label' => 'Item'],
                ['key' => 'type', 'label' => 'Type'],
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'quantity', 'label' => 'On hand', 'align' => 'right', 'format' => 'number'],
                ['key' => 'unit_cost', 'label' => 'Unit cost', 'align' => 'right', 'format' => 'money'],
                ['key' => 'value', 'label' => 'Value', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
        ];
    }

    public function purchases(ReportPeriod $period): array
    {
        $orders = PurchaseOrder::query()
            ->whereBetween('created_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->with('supplier:id,name')
            ->get();

        $receivedValue = (float) GoodsReceiptItem::query()
            ->whereHas('receipt', fn ($q) => $q->whereBetween('received_at', [$period->utcStart(), $period->utcEnd()])
                ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId)))
            ->get(['quantity', 'unit_cost'])
            ->sum(fn ($i) => (float) $i->quantity * (float) $i->unit_cost);

        $rows = $orders->map(fn (PurchaseOrder $order) => [
            'number' => $order->number,
            'supplier' => $order->supplier?->name,
            'status' => $order->status->label(),
            'total' => (float) $order->total,
        ])->all();

        return [
            'summary' => [
                ['label' => 'Purchase orders', 'value' => $orders->count(), 'format' => 'number'],
                ['label' => 'Ordered value', 'value' => round((float) $orders->sum('total'), 2), 'format' => 'money'],
                ['label' => 'Received value', 'value' => round($receivedValue, 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'number', 'label' => 'Number'],
                ['key' => 'supplier', 'label' => 'Supplier'],
                ['key' => 'status', 'label' => 'Status'],
                ['key' => 'total', 'label' => 'Total', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
        ];
    }

    public function waste(ReportPeriod $period): array
    {
        $records = WasteRecord::query()
            ->whereBetween('created_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->with('item')
            ->get();

        $byReason = $records->where('status', 'approved')
            ->groupBy(fn (WasteRecord $r) => $r->reason->label())
            ->map(fn (Collection $g) => round((float) $g->sum('cost'), 2));

        $rows = $records->map(fn (WasteRecord $r) => [
            'item' => $r->item?->name ?? 'Unknown',
            'reason' => $r->reason->label(),
            'quantity' => (float) $r->quantity,
            'cost' => (float) $r->cost,
            'status' => $r->status,
        ])->all();

        return [
            'summary' => [
                ['label' => 'Records', 'value' => $records->count(), 'format' => 'number'],
                // Only approved write-offs have actually left stock.
                ['label' => 'Total cost', 'value' => round((float) $records->where('status', 'approved')->sum('cost'), 2), 'format' => 'money'],
                ['label' => 'Pending approval', 'value' => $records->where('status', 'pending')->count(), 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'item', 'label' => 'Item'],
                ['key' => 'reason', 'label' => 'Reason'],
                ['key' => 'quantity', 'label' => 'Qty', 'align' => 'right', 'format' => 'number'],
                ['key' => 'cost', 'label' => 'Cost', 'align' => 'right', 'format' => 'money'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'rows' => $rows,
            'chart' => $byReason->map(fn ($value, $label) => ['label' => $label, 'value' => $value])->values()->all(),
        ];
    }

    public function expenses(ReportPeriod $period): array
    {
        $expenses = Expense::query()
            ->where('status', 'approved')
            ->whereBetween('expense_date', [$period->from->toDateString(), $period->to->toDateString()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->with('category:id,name')
            ->get();

        $byCategory = $expenses->groupBy(fn (Expense $e) => $e->category?->name ?? 'Uncategorised')
            ->map(fn (Collection $g) => round((float) $g->sum('amount'), 2));

        $rows = $expenses->map(fn (Expense $e) => [
            'date' => $e->expense_date?->toDateString(),
            'description' => $e->description,
            'category' => $e->category?->name,
            'amount' => (float) $e->amount,
        ])->all();

        return [
            'summary' => [
                ['label' => 'Expenses', 'value' => $expenses->count(), 'format' => 'number'],
                ['label' => 'Total', 'value' => round((float) $expenses->sum('amount'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'description', 'label' => 'Description'],
                ['key' => 'category', 'label' => 'Category'],
                ['key' => 'amount', 'label' => 'Amount', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
            'chart' => $byCategory->map(fn ($value, $label) => ['label' => $label, 'value' => $value])->values()->all(),
        ];
    }

    public function profit(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->get(['tax_total', 'total']);
        $netSales = round((float) $orders->sum('total') - (float) $orders->sum('tax_total'), 2);

        $cogs = round(
            $this->completedItems($period)->get(['quantity', 'unit_cost'])
                ->sum(fn ($i) => (float) $i->unit_cost * (float) $i->quantity),
            2,
        );

        $expenses = round((float) Expense::query()
            ->where('status', 'approved')
            ->whereBetween('expense_date', [$period->from->toDateString(), $period->to->toDateString()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId))
            ->sum('amount'), 2);

        $grossProfit = round($netSales - $cogs, 2);
        $netOperating = round($grossProfit - $expenses, 2);
        $margin = $netSales > 0 ? round($grossProfit / $netSales * 100, 1) : 0.0;

        return [
            'summary' => [
                ['label' => 'Net sales (excl. tax)', 'value' => $netSales, 'format' => 'money'],
                ['label' => 'Cost of goods sold', 'value' => $cogs, 'format' => 'money'],
                ['label' => 'Gross profit', 'value' => $grossProfit, 'format' => 'money'],
                ['label' => 'Gross margin', 'value' => $margin, 'format' => 'percent'],
                ['label' => 'Operating expenses', 'value' => $expenses, 'format' => 'money'],
                ['label' => 'Net operating result', 'value' => $netOperating, 'format' => 'money'],
            ],
            'columns' => [],
            'rows' => [],
        ];
    }

    public function tax(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->get(['placed_at', 'subtotal', 'discount_total', 'tax_total']);

        $byDay = [];
        foreach ($period->localDates() as $date) {
            $byDay[$date] = ['taxable' => 0.0, 'tax' => 0.0];
        }
        foreach ($orders as $order) {
            $date = $period->localDate($order->placed_at);
            if (! isset($byDay[$date])) {
                continue;
            }
            $byDay[$date]['taxable'] += (float) $order->subtotal - (float) $order->discount_total;
            $byDay[$date]['tax'] += (float) $order->tax_total;
        }

        $rows = array_map(
            fn ($date, $v) => ['date' => $date, 'taxable' => round($v['taxable'], 2), 'tax' => round($v['tax'], 2)],
            array_keys($byDay),
            $byDay,
        );

        return [
            'summary' => [
                ['label' => 'Taxable sales', 'value' => round((float) $orders->sum('subtotal') - (float) $orders->sum('discount_total'), 2), 'format' => 'money'],
                ['label' => 'Tax collected', 'value' => round((float) $orders->sum('tax_total'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'date', 'label' => 'Date'],
                ['key' => 'taxable', 'label' => 'Taxable', 'align' => 'right', 'format' => 'money'],
                ['key' => 'tax', 'label' => 'Tax', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
        ];
    }

    public function staff(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->with('cashier:id,name')->get(['user_id', 'total']);
        $voids = $this->voidedOrders($period)->with('cashier:id,name')->get(['user_id']);

        $rows = $orders
            ->groupBy(fn (Order $order) => $order->cashier?->name ?? 'Unknown')
            ->map(fn (Collection $group, string $name) => [
                'cashier' => $name,
                'orders' => $group->count(),
                'sales' => round((float) $group->sum('total'), 2),
                'voids' => $voids->filter(fn (Order $o) => ($o->cashier?->name ?? 'Unknown') === $name)->count(),
            ])
            ->sortByDesc('sales')
            ->values();

        return [
            'summary' => [
                ['label' => 'Staff', 'value' => $rows->count(), 'format' => 'number'],
                ['label' => 'Orders', 'value' => $orders->count(), 'format' => 'number'],
                ['label' => 'Voids', 'value' => $voids->count(), 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'cashier', 'label' => 'Staff'],
                ['key' => 'orders', 'label' => 'Orders', 'align' => 'right', 'format' => 'number'],
                ['key' => 'sales', 'label' => 'Sales', 'align' => 'right', 'format' => 'money'],
                ['key' => 'voids', 'label' => 'Voids', 'align' => 'right', 'format' => 'number'],
            ],
            'rows' => $rows->all(),
        ];
    }

    public function branches(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->with('branch:id,name')->get(['branch_id', 'total', 'tax_total']);

        $rows = $orders
            ->groupBy(fn (Order $order) => $order->branch?->name ?? 'Unknown')
            ->map(fn (Collection $group, string $name) => [
                'branch' => $name,
                'orders' => $group->count(),
                'gross' => round((float) $group->sum('total'), 2),
                'net' => round((float) $group->sum('total') - (float) $group->sum('tax_total'), 2),
            ])
            ->sortByDesc('gross')
            ->values();

        return [
            'summary' => [
                ['label' => 'Branches', 'value' => $rows->count(), 'format' => 'number'],
                ['label' => 'Gross sales', 'value' => round((float) $orders->sum('total'), 2), 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'branch', 'label' => 'Branch'],
                ['key' => 'orders', 'label' => 'Orders', 'align' => 'right', 'format' => 'number'],
                ['key' => 'gross', 'label' => 'Gross', 'align' => 'right', 'format' => 'money'],
                ['key' => 'net', 'label' => 'Net', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows->all(),
            'chart' => $rows->map(fn ($r) => ['label' => $r['branch'], 'value' => $r['gross']])->all(),
        ];
    }

    public function hourly(ReportPeriod $period): array
    {
        $orders = $this->completedOrders($period)->get(['placed_at', 'total']);

        $byHour = [];
        for ($h = 0; $h < 24; $h++) {
            $byHour[$h] = ['orders' => 0, 'total' => 0.0];
        }

        foreach ($orders as $order) {
            $hour = (int) $order->placed_at->copy()->setTimezone($period->timezone)->format('G');
            $byHour[$hour]['orders']++;
            $byHour[$hour]['total'] += (float) $order->total;
        }

        $rows = [];
        foreach ($byHour as $hour => $data) {
            $rows[] = ['hour' => sprintf('%02d:00', $hour), 'orders' => $data['orders'], 'total' => round($data['total'], 2)];
        }

        $busiest = collect($rows)->sortByDesc('total')->first();

        return [
            'summary' => [
                ['label' => 'Orders', 'value' => $orders->count(), 'format' => 'number'],
                ['label' => 'Busiest hour', 'value' => $busiest['total'] > 0 ? $busiest['hour'] : '—', 'format' => 'text'],
                ['label' => 'Busiest total', 'value' => $busiest['total'], 'format' => 'money'],
            ],
            'columns' => [
                ['key' => 'hour', 'label' => 'Hour'],
                ['key' => 'orders', 'label' => 'Orders', 'align' => 'right', 'format' => 'number'],
                ['key' => 'total', 'label' => 'Sales', 'align' => 'right', 'format' => 'money'],
            ],
            'rows' => $rows,
            'chart' => array_map(fn ($r) => ['label' => $r['hour'], 'value' => $r['total']], $rows),
        ];
    }

    public function loyalty(ReportPeriod $period): array
    {
        $accounts = LoyaltyAccount::query()->with('customer:id,name')->orderByDesc('points_balance')->limit(50)->get();

        $earned = (int) LoyaltyTransaction::query()->where('type', 'earn')->whereBetween('created_at', [$period->utcStart(), $period->utcEnd()])->sum('points');
        $redeemed = abs((int) LoyaltyTransaction::query()->where('type', 'redeem')->whereBetween('created_at', [$period->utcStart(), $period->utcEnd()])->sum('points'));

        $rows = $accounts->map(fn (LoyaltyAccount $account) => [
            'customer' => $account->customer?->name ?? 'Unknown',
            'points' => $account->points_balance,
        ])->all();

        return [
            'summary' => [
                ['label' => 'Loyalty members', 'value' => LoyaltyAccount::query()->count(), 'format' => 'number'],
                ['label' => 'Points earned', 'value' => $earned, 'format' => 'number'],
                ['label' => 'Points redeemed', 'value' => $redeemed, 'format' => 'number'],
                ['label' => 'Outstanding points', 'value' => (int) LoyaltyAccount::query()->sum('points_balance'), 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'customer', 'label' => 'Customer'],
                ['key' => 'points', 'label' => 'Points', 'align' => 'right', 'format' => 'number'],
            ],
            'rows' => $rows,
        ];
    }

    public function customers(ReportPeriod $period): array
    {
        $tenant = app(TenantContext::class)->tenant();

        if ($tenant === null) {
            return ['summary' => [], 'columns' => [], 'rows' => [], 'chart' => []];
        }

        $service = app(CustomerSegmentationService::class);
        $summary = $service->summary($tenant);
        $profiles = $service->profiles($tenant);

        $bySegment = collect($summary['segments'])->keyBy('key');

        $rows = $profiles->take(100)->map(fn (array $p) => [
            'customer' => $p['name'],
            'segment' => CustomerSegmentationService::SEGMENTS[$p['segment']] ?? $p['segment'],
            'orders' => $p['orders'],
            'spend' => $p['spend'],
            'last_order' => $p['last_order_at'],
        ])->all();

        return [
            'summary' => [
                ['label' => 'Customers', 'value' => $summary['total'], 'format' => 'number'],
                ['label' => 'Lifetime spend', 'value' => $summary['spend'], 'format' => 'money'],
                ['label' => 'Champions', 'value' => (int) ($bySegment['champions']['count'] ?? 0), 'format' => 'number'],
                ['label' => 'High-value', 'value' => (int) ($bySegment['high_value']['count'] ?? 0), 'format' => 'number'],
                ['label' => 'At risk', 'value' => (int) ($bySegment['at_risk']['count'] ?? 0), 'format' => 'number'],
                ['label' => 'Lost', 'value' => (int) ($bySegment['lost']['count'] ?? 0), 'format' => 'number'],
            ],
            'columns' => [
                ['key' => 'customer', 'label' => 'Customer'],
                ['key' => 'segment', 'label' => 'Segment'],
                ['key' => 'orders', 'label' => 'Orders', 'align' => 'right', 'format' => 'number'],
                ['key' => 'spend', 'label' => 'Spend', 'align' => 'right', 'format' => 'money'],
                ['key' => 'last_order', 'label' => 'Last order', 'format' => 'date'],
            ],
            'rows' => $rows,
            'chart' => collect($summary['segments'])
                ->filter(fn (array $s) => $s['count'] > 0)
                ->map(fn (array $s) => ['label' => $s['label'], 'value' => $s['count']])
                ->values()
                ->all(),
        ];
    }

    protected function completedOrders(ReportPeriod $period)
    {
        return Order::query()
            ->where('status', 'completed')
            ->whereBetween('placed_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId));
    }

    protected function voidedOrders(ReportPeriod $period)
    {
        return Order::query()
            ->where('status', 'voided')
            ->whereBetween('voided_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId));
    }

    protected function completedItems(ReportPeriod $period)
    {
        return OrderItem::query()->whereHas('order', fn ($q) => $q
            ->where('status', 'completed')
            ->whereBetween('placed_at', [$period->utcStart(), $period->utcEnd()])
            ->when($period->branchId, fn ($q) => $q->where('branch_id', $period->branchId)));
    }
}
