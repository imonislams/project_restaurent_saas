<?php

namespace App\Http\Controllers;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Menu\Models\Product;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Reporting\DashboardAnalyticsService;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected OnboardingService $onboarding,
        protected DashboardAnalyticsService $analytics,
    ) {}

    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        // Platform operators belong in the control center, not a tenant dashboard.
        if ($user->isPlatformAdmin()) {
            return redirect()->route('platform.dashboard');
        }

        $tenant = $user->tenant;

        if ($tenant === null) {
            return Inertia::render('Dashboard', [
                'tenant' => null,
                'checklist' => [],
                'warnings' => [],
                'progress' => null,
                'stats' => [],
                'analytics' => null,
                'business360' => null,
            ]);
        }

        $branch = $this->onboarding->branchForOnboarding($tenant);
        $completed = $tenant->hasCompletedOnboarding();

        return Inertia::render('Dashboard', [
            'tenant' => [
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'logo_url' => $tenant->logo_url,
                'status' => $tenant->status->value,
                'on_trial' => $tenant->onTrial(),
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'onboarding_completed' => $completed,
                'currency' => $this->currency($tenant, $branch),
                'timezone' => $branch?->effectiveTimezone() ?? $tenant->getSetting('region.timezone'),
                'plan' => $tenant->currentPlan()?->name,
                'subscription_status' => $tenant->subscription?->status?->value,
            ],
            'checklist' => $this->onboarding->checklist($tenant),
            'warnings' => $this->onboarding->incompleteWarnings($tenant),
            'progress' => $this->onboarding->progress($tenant),
            'stats' => [
                'branches' => $tenant->branches()->count(),
                'users' => $tenant->users()->count(),
            ],
            'analytics' => $completed ? $this->analytics->summary($tenant) : null,
            'customerAnalytics' => $completed ? $this->analytics->customerAnalytics($tenant) : null,
            'business360' => $completed ? $this->business360($tenant) : null,
        ]);
    }

    /**
     * @return array<string, int>
     */
    protected function business360(Tenant $tenant): array
    {
        return [
            'branches' => $tenant->branches()->count(),
            'users' => $tenant->users()->count(),
            'products' => Product::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
            'customers' => Customer::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
            'active_customers' => Customer::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->where('is_active', true)->count(),
            'low_stock' => $this->analytics->lowStockCount($tenant),
            'pending_approvals' => $this->analytics->pendingApprovals($tenant),
        ];
    }

    protected function currency(Tenant $tenant, ?Branch $branch): string
    {
        return $branch?->effectiveCurrency()
            ?? $tenant->getSetting('region.currency')
            ?? 'USD';
    }
}
