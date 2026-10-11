<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Subscriptions\Models\Plan;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class EntitlementsController extends Controller
{
    /** Modules gated by plan entitlements (see EnsureFeature middleware). */
    protected const FEATURES = ['pos', 'kitchen', 'tables', 'menu', 'inventory', 'purchasing', 'waste', 'transfers', 'accounts', 'reports'];

    public function index(): Response
    {
        $plans = Plan::query()->with('prices')->orderBy('sort_order')->get();

        return Inertia::render('Platform/Entitlements', [
            'features' => self::FEATURES,
            'plans' => $plans->map(fn (Plan $plan) => [
                'id' => $plan->getKey(),
                'name' => $plan->name,
                'slug' => $plan->slug,
                'is_active' => $plan->is_active,
                'archived' => $plan->isArchived(),
                'version' => $plan->version,
                'features' => $plan->features ?? [],
                'limits' => $plan->limits ?? [],
                'subscriptions_count' => $plan->subscriptions()->count(),
            ]),
            'limit_keys' => ['branches', 'users', 'orders_this_month'],
        ]);
    }
}
