<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Platform/Plans', [
            'plans' => Plan::query()
                ->withCount('subscriptions')
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Plan $plan) => [
                    'id' => $plan->getKey(),
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'description' => $plan->description,
                    'price_monthly' => (float) $plan->price_monthly,
                    'price_yearly' => (float) $plan->price_yearly,
                    'trial_days' => $plan->trial_days,
                    'features' => $plan->features ?? [],
                    'limits' => $plan->limits ?? [],
                    'is_active' => $plan->is_active,
                    'subscriptions_count' => $plan->subscriptions_count,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Plan::create($this->validated($request));

        return back()->with('success', 'Plan created.');
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $plan->update($this->validated($request, $plan));

        // Plan changes affect entitlements; drop cached plans for its tenants.
        Subscription::withoutGlobalScopes()
            ->where('plan_id', $plan->getKey())
            ->pluck('tenant_id')
            ->each(fn ($tenantId) => Tenant::forgetEntitlementCache((int) $tenantId));

        return back()->with('success', 'Plan updated.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('plans', 'slug')->ignore($plan?->getKey())],
            'description' => ['nullable', 'string', 'max:255'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly' => ['required', 'numeric', 'min:0'],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:50'],
            'limits' => ['nullable', 'array'],
            'limits.branches' => ['nullable', 'integer', 'min:0'],
            'limits.users' => ['nullable', 'integer', 'min:0'],
            'limits.orders_this_month' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['features'] = $data['features'] ?? [];
        $data['limits'] = $data['limits'] ?? [];
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $data['is_active'] = $data['is_active'] ?? true;

        return $data;
    }
}
