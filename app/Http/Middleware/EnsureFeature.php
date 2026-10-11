<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates a route group by a plan feature: ->middleware('feature:kitchen').
 * A tenant without a plan is unrestricted.
 */
class EnsureFeature
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $tenant = $this->context->tenant() ?? $request->user()?->tenant;

        if ($tenant && ! $tenant->hasFeature($feature)) {
            abort(403, 'This feature is not available on your current plan.');
        }

        return $next($request);
    }
}
