<?php

namespace App\Domain\Reporting;

use App\Domain\Branches\Support\BranchScope;
use App\Domain\Customers\CustomerSegmentationService;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;

/**
 * Read-only, non-period dashboard metrics: the always-on "right now" strip and
 * lifetime customer analytics. Every figure is real — nothing is mocked.
 *
 * Period-based figures (sales, orders, payments, trend) live in
 * DashboardOverviewService, which is driven by a ReportPeriod.
 */
class DashboardAnalyticsService
{
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

    /**
     * Guests currently seated: participants of active dining sessions
     * (open, bill requested or settling), scoped to the user's branches.
     */
    public function activeGuestsCount(Tenant $tenant): int
    {
        return (int) DiningParticipant::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->whereHas('session', function ($query) use ($tenant) {
                $query->withoutGlobalScopes()
                    ->where('tenant_id', $tenant->getKey())
                    ->whereIn('status', [
                        DiningSessionStatus::Open->value,
                        DiningSessionStatus::BillRequested->value,
                        DiningSessionStatus::Settling->value,
                    ]);

                BranchScope::apply($query);
            })
            ->count();
    }
}
