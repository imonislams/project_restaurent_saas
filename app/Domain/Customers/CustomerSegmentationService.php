<?php

namespace App\Domain\Customers;

use App\Domain\Customers\Models\Customer;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Customer segmentation built from real order history (RFM — recency,
 * frequency, monetary). Nothing is stored or faked: every metric is derived
 * from completed orders.
 */
class CustomerSegmentationService
{
    public const SEGMENTS = [
        'champions' => 'Champions',
        'loyal' => 'Loyal',
        'high_value' => 'High-value',
        'new' => 'New',
        'regular' => 'Regular',
        'at_risk' => 'At risk',
        'lost' => 'Lost',
    ];

    public const AT_RISK_DAYS = 45;

    public const LOST_DAYS = 90;

    /**
     * Row-per-customer RFM profile, richest spend first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function profiles(Tenant $tenant): Collection
    {
        $orders = Order::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->where('status', 'completed')
            ->whereNotNull('customer_id')
            ->selectRaw('customer_id, COUNT(*) as orders_count, SUM(total) as total_spend, SUM(tax_total) as tax_total, MIN(placed_at) as first_order, MAX(placed_at) as last_order')
            ->groupBy('customer_id')
            ->get();

        if ($orders->isEmpty()) {
            return collect();
        }

        $averageSpend = (float) $orders->avg('total_spend');

        $customers = Customer::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->get()
            ->keyBy('id');

        // Distinct dining sessions per customer — a real visit count, separate
        // from the order count (a single visit can produce several orders).
        $visits = DiningSession::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->whereNotNull('customer_id')
            ->selectRaw('customer_id, COUNT(*) as visits_count')
            ->groupBy('customer_id')
            ->pluck('visits_count', 'customer_id');

        $now = Carbon::now();

        return $orders
            ->map(function ($row) use ($customers, $now, $averageSpend, $visits) {
                $customer = $customers->get($row->customer_id);

                if (! $customer) {
                    return null;
                }

                $lastOrder = Carbon::parse($row->last_order);
                $recencyDays = (int) $lastOrder->diffInDays($now);
                $frequency = (int) $row->orders_count;
                $monetary = round((float) $row->total_spend, 2);

                return [
                    'customer_id' => $customer->getKey(),
                    'name' => $customer->name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'orders' => $frequency,
                    'visits' => (int) $visits->get($row->customer_id, 0),
                    'spend' => $monetary,
                    'average_ticket' => $frequency > 0 ? round($monetary / $frequency, 2) : 0.0,
                    'recency_days' => $recencyDays,
                    'last_order_at' => $lastOrder->toIso8601String(),
                    'segment' => $this->classify($recencyDays, $frequency, $monetary, $averageSpend),
                ];
            })
            ->filter()
            ->sortByDesc('spend')
            ->values();
    }

    /**
     * @return array{total: int, spend: float, segments: array<string, array{key: string, label: string, count: int, spend: float}>}
     */
    public function summary(Tenant $tenant): array
    {
        $profiles = $this->profiles($tenant);

        $segments = collect(self::SEGMENTS)->map(fn (string $label, string $key) => [
            'key' => $key,
            'label' => $label,
            'count' => 0,
            'spend' => 0.0,
        ])->all();

        foreach ($profiles as $profile) {
            $segments[$profile['segment']]['count']++;
            $segments[$profile['segment']]['spend'] = round($segments[$profile['segment']]['spend'] + $profile['spend'], 2);
        }

        return [
            'total' => $profiles->count(),
            'spend' => round((float) $profiles->sum('spend'), 2),
            'segments' => array_values($segments),
        ];
    }

    protected function classify(int $recencyDays, int $frequency, float $monetary, float $averageSpend): string
    {
        if ($recencyDays > self::LOST_DAYS) {
            return 'lost';
        }

        if ($recencyDays > self::AT_RISK_DAYS) {
            return 'at_risk';
        }

        if ($frequency >= 5 && $monetary >= $averageSpend) {
            return 'champions';
        }

        if ($frequency >= 3) {
            return 'loyal';
        }

        if ($averageSpend > 0 && $monetary >= $averageSpend * 2) {
            return 'high_value';
        }

        if ($frequency <= 1 && $recencyDays <= 30) {
            return 'new';
        }

        return 'regular';
    }
}
