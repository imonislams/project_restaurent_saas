<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Models\DiningSession;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * QR dining analytics. Metrics use consistent order/payment statuses and never
 * count unpaid/cancelled orders as settled revenue.
 */
class QrAnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function forPeriod(Tenant $tenant, Carbon $from, Carbon $to, ?int $branchId = null): array
    {
        $sessionsQuery = DiningSession::query()
            ->whereBetween('started_at', [$from, $to])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        $ordersQuery = Order::query()
            ->where('source', 'qr')
            ->whereBetween('placed_at', [$from, $to])
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        $sessionCount = (clone $sessionsQuery)->count();
        $orderCount = (clone $ordersQuery)->count();
        $revenue = (float) (clone $ordersQuery)->where('status', 'completed')->sum('total');
        $cancelled = (clone $ordersQuery)->where('status', 'voided')->count();
        $rejected = (clone $ordersQuery)->where('acceptance_status', 'rejected')->count();

        $average = $orderCount > 0 ? round($revenue / $orderCount, 2) : 0.0;
        $perSession = $sessionCount > 0 ? round($orderCount / $sessionCount, 2) : 0.0;

        $topItems = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.source', 'qr')
            ->whereBetween('orders.placed_at', [$from, $to])
            ->when($branchId, fn ($q) => $q->where('orders.branch_id', $branchId))
            ->groupBy('order_items.name')
            ->select('order_items.name', DB::raw('SUM(order_items.quantity) as quantity'), DB::raw('SUM(order_items.line_total) as revenue'))
            ->orderByDesc('quantity')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'quantity' => (float) $row->quantity,
                'revenue' => (float) $row->revenue,
            ]);

        return [
            'summary' => [
                ['label' => 'QR sessions', 'value' => $sessionCount, 'format' => 'number'],
                ['label' => 'QR orders', 'value' => $orderCount, 'format' => 'number'],
                ['label' => 'QR revenue', 'value' => $revenue, 'format' => 'money'],
                ['label' => 'Average order value', 'value' => $average, 'format' => 'money'],
                ['label' => 'Orders per session', 'value' => $perSession, 'format' => 'number'],
                ['label' => 'Cancelled / rejected', 'value' => $cancelled + $rejected, 'format' => 'number'],
            ],
            'top_items' => $topItems,
            'currency' => $tenant->getSetting('region.currency', 'USD'),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'branch_id' => $branchId,
        ];
    }
}
