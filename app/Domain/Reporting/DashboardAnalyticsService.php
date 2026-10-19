<?php

namespace App\Domain\Reporting;

use App\Domain\Branches\Support\BranchScope;
use App\Domain\Customers\CustomerSegmentationService;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Payments\Models\Payment;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Read-only dashboard analytics for a tenant, derived from the same records the
 * operational modules write. Every figure is real — nothing is mocked.
 */
class DashboardAnalyticsService
{
    private const TREND_DAYS = 14;

    /** @return array<string, mixed> */
    public function summary(Tenant $tenant): array
    {
        $timezone = $tenant->getSetting('region.timezone') ?? config('app.timezone');
        $currency = $tenant->getSetting('region.currency', 'USD');

        $now = Carbon::now($timezone);
        $start = $now->copy()->subDays(self::TREND_DAYS - 1)->startOfDay();
        $utcStart = $start->copy()->utc();
        $utcEnd = $now->copy()->endOfDay()->utc();

        $orders = tap(
            Order::withoutGlobalScopes()->where('tenant_id', $tenant->getKey()),
            fn ($query) => BranchScope::apply($query),
        )
            ->where('status', 'completed')
            ->whereBetween('placed_at', [$utcStart, $utcEnd])
            ->get(['id', 'placed_at', 'total', 'tax_total']);

        $net = fn (Collection $rows) => round((float) $rows->sum('total') - (float) $rows->sum('tax_total'), 2);
        $todayRows = $orders->filter(fn (Order $o) => $o->placed_at?->copy()->setTimezone($timezone)->isSameDay($now));

        $trend = [];
        for ($i = 0; $i < self::TREND_DAYS; $i++) {
            $day = $start->copy()->addDays($i);
            $dayRows = $orders->filter(fn (Order $o) => $o->placed_at?->copy()->setTimezone($timezone)->isSameDay($day));
            $trend[] = ['label' => $day->format('M j'), 'value' => $net($dayRows)];
        }

        $topProducts = $this->topProducts($tenant, $utcStart, $utcEnd);
        $paymentMix = $this->paymentMix($tenant, $utcStart, $utcEnd);
        $busiest = $this->busiestHours($orders, $timezone);

        $kpis = [
            ['label' => 'Net sales (today)', 'value' => $net($todayRows), 'format' => 'money'],
            ['label' => 'Net sales ('.self::TREND_DAYS.' days)', 'value' => $net($orders), 'format' => 'money'],
            ['label' => 'Orders (today)', 'value' => $todayRows->count(), 'format' => 'number'],
            ['label' => 'Average ticket', 'value' => $orders->count() > 0 ? round($net($orders) / $orders->count(), 2) : 0, 'format' => 'money'],
        ];

        return [
            'currency' => $currency,
            'kpis' => $kpis,
            'trend' => $trend,
            'top_products' => $topProducts,
            'payment_mix' => $paymentMix,
            'busiest_hours' => $busiest,
        ];
    }

    /** @return array<int, array{label: string, value: float}> */
    protected function topProducts(Tenant $tenant, Carbon $utcStart, Carbon $utcEnd): array
    {
        return OrderItem::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->whereHas('order', function ($q) use ($tenant, $utcStart, $utcEnd) {
                $q->withoutGlobalScopes()->where('tenant_id', $tenant->getKey());
                BranchScope::apply($q);
                $q->where('status', 'completed')
                    ->whereBetween('placed_at', [$utcStart, $utcEnd]);
            })
            ->get(['name', 'quantity', 'line_total'])
            ->groupBy('name')
            ->map(fn (Collection $group, string $name) => [
                'label' => $name,
                'value' => round((float) $group->sum('line_total'), 2),
            ])
            ->sortByDesc('value')
            ->take(6)
            ->values()
            ->all();
    }

    /** @return array<int, array{label: string, value: float}> */
    protected function paymentMix(Tenant $tenant, Carbon $utcStart, Carbon $utcEnd): array
    {
        return Payment::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->whereHas('order', function ($q) use ($tenant, $utcStart, $utcEnd) {
                $q->withoutGlobalScopes()->where('tenant_id', $tenant->getKey());
                BranchScope::apply($q);
                $q->where('status', 'completed')
                    ->whereBetween('placed_at', [$utcStart, $utcEnd]);
            })
            ->with('method:id,name')
            ->get(['payment_method_id', 'amount'])
            ->groupBy(fn (Payment $p) => $p->method?->name ?? 'Other')
            ->map(fn (Collection $group, string $name) => [
                'label' => $name,
                'value' => round((float) $group->sum('amount'), 2),
            ])
            ->sortByDesc('value')
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return array<int, array{label: string, value: float}>
     */
    protected function busiestHours(Collection $orders, string $timezone): array
    {
        $byHour = [];
        foreach ($orders as $order) {
            $hour = (int) $order->placed_at?->copy()->setTimezone($timezone)->format('G');
            $byHour[$hour] = ($byHour[$hour] ?? 0) + 1;
        }

        ksort($byHour);

        return collect($byHour)
            ->map(fn (int $count, int $hour) => ['label' => sprintf('%02d:00', $hour), 'value' => $count])
            ->values()
            ->all();
    }

    /**
     * Customer segmentation surfaced on the dashboard: segment distribution,
     * lifetime spend and the highest-value guests. Derived from real completed
     * orders — nothing is mocked.
     *
     * @return array<string, mixed>
     */
    public function customerAnalytics(Tenant $tenant): array
    {
        $service = app(CustomerSegmentationService::class);
        $summary = $service->summary($tenant);
        $profiles = $service->profiles($tenant);

        return [
            'total' => $summary['total'],
            'spend' => $summary['spend'],
            'repeat' => $profiles->where('orders', '>', 1)->count(),
            'segments' => collect($summary['segments'])->filter(fn (array $s) => $s['count'] > 0)->values()->all(),
            'top' => $profiles->take(5)->map(fn (array $p) => [
                'name' => $p['name'],
                'segment' => $p['segment'],
                'orders' => $p['orders'],
                'spend' => $p['spend'],
            ])->values()->all(),
        ];
    }

    public function lowStockCount(Tenant $tenant): int
    {
        $threshold = (float) ($tenant->getSetting('inventory.low_stock_threshold', 0) ?? 0);

        return tap(
            StockBalance::withoutGlobalScopes()->where('tenant_id', $tenant->getKey()),
            fn ($query) => BranchScope::apply($query),
        )
            ->where('quantity', '<=', $threshold)
            ->count();
    }

    public function pendingApprovals(Tenant $tenant): int
    {
        return tap(
            Order::withoutGlobalScopes()->where('tenant_id', $tenant->getKey()),
            fn ($query) => BranchScope::apply($query),
        )
            ->where('acceptance_status', 'pending')
            ->count();
    }
}
