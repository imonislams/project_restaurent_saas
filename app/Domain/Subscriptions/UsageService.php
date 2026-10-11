<?php

namespace App\Domain\Subscriptions;

use App\Domain\Orders\Models\Order;
use App\Domain\Subscriptions\Models\UsageRecord;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Validation\ValidationException;

/**
 * Usage metering and backend plan-limit enforcement. Limits come from the
 * tenant's plan (resolved server-side); a tenant without a plan is unrestricted.
 */
class UsageService
{
    /** @return array<string, int> */
    public function metrics(Tenant $tenant): array
    {
        return [
            'branches' => $tenant->branches()->count(),
            'users' => $tenant->users()->count(),
            'orders_this_month' => Order::query()
                ->where('tenant_id', $tenant->getKey())
                ->whereBetween('placed_at', [now()->startOfMonth(), now()->endOfMonth()])
                ->count(),
        ];
    }

    public function record(Tenant $tenant): void
    {
        foreach ($this->metrics($tenant) as $metric => $value) {
            UsageRecord::create([
                'tenant_id' => $tenant->getKey(),
                'metric' => $metric,
                'value' => $value,
                'period_start' => now()->startOfMonth(),
                'period_end' => now()->endOfMonth(),
                'recorded_at' => now(),
            ]);
        }
    }

    public function limit(Tenant $tenant, string $metric): ?int
    {
        return $tenant->planLimit($metric);
    }

    /**
     * Throw if adding `$additional` of a metric would exceed the plan limit.
     */
    public function guard(Tenant $tenant, string $metric, int $additional = 1): void
    {
        $limit = $this->limit($tenant, $metric);

        if ($limit === null) {
            return;
        }

        $current = $this->metrics($tenant)[$metric] ?? 0;

        if ($current + $additional > $limit) {
            throw ValidationException::withMessages([
                $metric => "Your plan allows up to {$limit} ".str_replace('_', ' ', $metric).'.',
            ]);
        }
    }
}
