<?php

namespace App\Http\Middleware;

use App\Domain\Onboarding\Enums\OnboardingStep;
use App\Domain\Onboarding\OnboardingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps an owner inside the setup journey until it is complete: any attempt to
 * reach the dashboard or a management module is redirected to the exact step
 * still holding them up. Platform operators and impersonating sessions are
 * never trapped here.
 */
class EnsureOnboardingComplete
{
    public function __construct(protected OnboardingService $onboarding) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isPlatformAdmin()) {
            return $next($request);
        }

        if ($request->session()->has('impersonator_id')) {
            return $next($request);
        }

        $tenant = $user->tenant;

        if ($tenant === null || $tenant->hasCompletedOnboarding()) {
            return $next($request);
        }

        $step = $this->onboarding->firstIncompleteStep($tenant) ?? OnboardingStep::Review;

        return redirect()->route('onboarding.show', ['step' => $step->value]);
    }
}
