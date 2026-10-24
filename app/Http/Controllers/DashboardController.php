<?php

namespace App\Http\Controllers;

use App\Domain\Branches\Models\Branch;
use App\Domain\Customers\Models\Customer;
use App\Domain\Menu\Models\Product;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Reporting\DashboardAnalyticsService;
use App\Domain\Reporting\DashboardOverviewService;
use App\Domain\Reporting\ReportPeriod;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected OnboardingService $onboarding,
        protected DashboardOverviewService $overview,
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
                'period' => null,
                'analytics' => null,
                'customerAnalytics' => null,
                'business360' => null,
            ]);
        }

        $branch = $this->onboarding->branchForOnboarding($tenant);
        $completed = $tenant->hasCompletedOnboarding();
        $period = $this->resolvePeriod($request, $tenant, $branch);

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
            'period' => [
                'preset' => $period->preset ?? 'custom',
                'from' => $period->from->toDateString(),
                'to' => $period->to->toDateString(),
                'timezone' => $period->timezone,
            ],
            'analytics' => $completed ? $this->overview->build($tenant, $period, $user->hasTenantWideBranchAccess()) : null,
            'customerAnalytics' => $completed ? $this->analytics->customerAnalytics($tenant) : null,
            'business360' => $completed ? $this->business360($tenant) : null,
        ]);
    }

    /**
     * Resolve the requested reporting window. Branch scoping is implicit (the
     * BranchScope global scope), so no branch id is forced here.
     */
    protected function resolvePeriod(Request $request, Tenant $tenant, ?Branch $branch): ReportPeriod
    {
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        if ($from !== '' && $to !== '') {
            return ReportPeriod::make($from, $to, null, $tenant, $branch);
        }

        $preset = $request->string('preset')->toString();

        return ReportPeriod::forPreset($preset !== '' ? $preset : 'today', null, $tenant, $branch);
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
            'active_guests' => $this->analytics->activeGuestsCount($tenant),
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
