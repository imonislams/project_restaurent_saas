<?php

namespace App\Http\Controllers;

use App\Domain\Branches\Models\Branch;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(protected OnboardingService $onboarding) {}

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
            ]);
        }

        $branch = $this->onboarding->branchForOnboarding($tenant);

        return Inertia::render('Dashboard', [
            'tenant' => [
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status->value,
                'on_trial' => $tenant->onTrial(),
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'onboarding_completed' => $tenant->hasCompletedOnboarding(),
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
        ]);
    }

    protected function currency(Tenant $tenant, ?Branch $branch): string
    {
        return $branch?->effectiveCurrency()
            ?? $tenant->getSetting('region.currency')
            ?? 'USD';
    }
}
