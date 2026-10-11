<?php

namespace App\Http\Controllers\Tenant;

use App\Domain\Branches\BranchService;
use App\Domain\Branches\Models\Branch;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\BranchRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The restaurant owner's branch manager. Branches are capped by the plan's
 * `branches` limit; each new branch is provisioned with its own stock location
 * and cash account.
 */
class BranchController extends Controller
{
    public function __construct(protected BranchService $branches) {}

    public function index(Request $request): Response
    {
        $tenant = $this->tenant($request);

        return Inertia::render('Branches/Index', [
            'branches' => $tenant->branches()
                ->orderByDesc('is_primary')
                ->orderBy('name')
                ->get()
                ->map(fn (Branch $branch) => [
                    'id' => $branch->getKey(),
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'address' => $branch->address,
                    'phone' => $branch->phone,
                    'timezone' => $branch->effectiveTimezone(),
                    'currency' => $branch->effectiveCurrency(),
                    'service_types' => $branch->serviceTypes(),
                    'is_active' => $branch->is_active,
                    'is_primary' => $branch->is_primary,
                ]),
            'limit' => $tenant->planLimit('branches'),
            'used' => $tenant->branches()->count(),
            'options' => app(OnboardingService::class)->options(),
        ]);
    }

    public function store(BranchRequest $request): RedirectResponse
    {
        $this->branches->create($this->tenant($request), $request->validated(), $request->user());

        return back()->with('success', 'Branch created.');
    }

    public function update(BranchRequest $request, Branch $branch): RedirectResponse
    {
        $this->branches->update($branch, $request->validated(), $request->user());

        return back()->with('success', 'Branch updated.');
    }

    public function deactivate(Request $request, Branch $branch): RedirectResponse
    {
        $this->branches->deactivate($branch, $request->user());

        return back()->with('success', 'Branch deactivated.');
    }

    public function activate(Request $request, Branch $branch): RedirectResponse
    {
        $this->branches->activate($branch, $request->user());

        return back()->with('success', 'Branch activated.');
    }

    public function setPrimary(Request $request, Branch $branch): RedirectResponse
    {
        $this->branches->setPrimary($branch, $request->user());

        return back()->with('success', 'Primary branch updated.');
    }

    protected function tenant(Request $request): Tenant
    {
        $tenant = $request->user()?->tenant;

        abort_if($tenant === null, 403);

        return $tenant;
    }
}
