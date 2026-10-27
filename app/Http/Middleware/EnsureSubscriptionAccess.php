<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps a tenant inside the Subscription page while their plan is not active
 * (no plan, expired, cancelled or suspended).
 *
 * This is a billing state, not an account suspension: the user stays signed in,
 * and the page where they can choose a plan and pay is always reachable. Closing
 * the whole account is EnsureTenantIsActive's job.
 */
class EnsureSubscriptionAccess
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isPlatformAdmin()) {
            return $next($request);
        }

        $tenant = $this->context->tenant() ?? $user->tenant;

        if ($tenant === null) {
            return $next($request);
        }

        if ($tenant->subscriptionAccess() || $request->routeIs('subscription.*')) {
            return $next($request);
        }

        return redirect()
            ->route('subscription.index')
            ->with('error', 'Your plan is not active — choose a plan to keep using Touch Dine.');
    }
}
