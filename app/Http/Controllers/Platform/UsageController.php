<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class UsageController extends Controller
{
    public function index(): Response
    {
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        return Inertia::render('Platform/Usage', [
            'tenants' => Tenant::query()
                ->with('subscription.plan')
                ->withCount(['branches', 'users'])
                ->orderBy('name')
                ->paginate(25)
                ->through(function (Tenant $tenant) use ($monthStart, $monthEnd) {
                    $orders = Order::withoutGlobalScopes()
                        ->where('tenant_id', $tenant->getKey())
                        ->whereBetween('placed_at', [$monthStart, $monthEnd])
                        ->count();

                    $metrics = [
                        'branches' => $tenant->branches_count,
                        'users' => $tenant->users_count,
                        'orders_this_month' => $orders,
                    ];

                    $limits = [
                        'branches' => $tenant->planLimit('branches'),
                        'users' => $tenant->planLimit('users'),
                        'orders_this_month' => $tenant->planLimit('orders_this_month'),
                    ];

                    $overLimit = false;
                    foreach ($metrics as $metric => $value) {
                        if ($limits[$metric] !== null && $value >= $limits[$metric]) {
                            $overLimit = true;
                        }
                    }

                    return [
                        'id' => $tenant->getKey(),
                        'name' => $tenant->name,
                        'status' => $tenant->status->value,
                        'plan' => $tenant->subscription?->plan?->name,
                        'metrics' => $metrics,
                        'limits' => $limits,
                        'over_limit' => $overLimit,
                    ];
                }),
        ]);
    }
}
