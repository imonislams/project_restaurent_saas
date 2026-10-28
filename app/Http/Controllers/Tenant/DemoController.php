<?php

namespace App\Http\Controllers\Tenant;

use App\Domain\Demo\DemoDataService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Drives the demo workspace from the browser: the progress screen shown right
 * after onboarding, one generation step per request (so the work stays inside
 * PHP's limits and progress is visible), and removal.
 */
class DemoController extends Controller
{
    public function __construct(protected DemoDataService $demo) {}

    public function setup(Request $request): Response|RedirectResponse
    {
        $tenant = $this->tenant($request);
        $state = $this->demo->state($tenant);

        if (($state['status'] ?? 'none') === 'none') {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Demo/Setup', ['demo' => $state]);
    }

    /**
     * Run the next pending step. Answers with a redirect back to the screen the
     * caller is on, so both the progress screen and the dashboard banner can
     * drive it.
     */
    public function step(Request $request): RedirectResponse
    {
        $tenant = $this->tenant($request);
        $batch = $this->demo->latest($tenant);

        if ($batch === null) {
            return redirect()->route('dashboard')->with('error', 'There is no demo setup to continue.');
        }

        if (! $batch->isActive()) {
            return back();
        }

        try {
            $this->demo->runNextStep($batch);
        } catch (\Throwable $e) {
            report($e);

            // The batch stores the same failure; surfacing it here is what makes
            // it visible on screen instead of a silently stuck progress bar.
            return back()->with('error', $e->getMessage());
        }

        return back();
    }

    /**
     * The Demo data tab under Settings: state, coverage, counts and run history.
     */
    public function settings(Request $request): Response
    {
        $tenant = $this->tenant($request);

        return Inertia::render('Settings/Demo', [
            'demo' => $this->demo->state($tenant),
            'history' => $this->demo->history($tenant),
            'currency' => $tenant->getSetting('region.currency') ?? 'USD',
        ]);
    }

    /**
     * Rebuild: remove what exists, then generate a fresh workspace with the same
     * number of days as the previous run.
     */
    public function rebuild(Request $request): RedirectResponse
    {
        $tenant = $this->tenant($request);
        $previousDays = $this->demo->latest($tenant, true)?->days;

        try {
            $this->demo->purge($tenant, $request->user());
            $this->demo->start($tenant, $request->user(), $previousDays);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', 'Could not rebuild the demo data: '.$e->getMessage());
        }

        return redirect()->route('demo.setup')->with('success', 'Rebuilding your demo workspace.');
    }

    /**
     * Start (or resume) a run — used by the dashboard banner and the demo tab.
     */
    public function generate(Request $request): RedirectResponse
    {
        try {
            $this->demo->start($this->tenant($request), $request->user());
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('demo.setup');
    }

    /**
     * Remove every record the tenant's demo runs created. Guarded by a typed
     * confirmation of the workspace slug — this deletes a large amount of data.
     */
    public function purge(Request $request): RedirectResponse
    {
        $tenant = $this->tenant($request);
        $data = $request->validate(['confirm' => ['required', 'string']]);

        if ($data['confirm'] !== $tenant->slug) {
            throw ValidationException::withMessages([
                'confirm' => 'Type the workspace identifier exactly to confirm.',
            ]);
        }

        try {
            $result = $this->demo->purge($tenant, $request->user());
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', trans_choice(
            '{0}No demo data was found.|[1]Removed one demo record.|[2,*]Removed :count demo records.',
            $result['records'],
            ['count' => $result['records']],
        ));
    }

    protected function tenant(Request $request): Tenant
    {
        $tenant = $request->user()?->tenant;

        abort_if($tenant === null, 403);

        return $tenant;
    }
}
