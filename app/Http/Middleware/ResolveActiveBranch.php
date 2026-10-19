<?php

namespace App\Http\Middleware;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the single active branch for the request and binds it onto the
 * TenantContext, so every module shares one consistent branch.
 *
 * The branch is resolved from trusted server-side context only (the
 * authenticated user's accessible branches) with the precedence:
 * valid session choice → tenant primary branch → first accessible branch.
 * A branch the user cannot access is never honoured (fail closed).
 */
class ResolveActiveBranch
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $tenant = $this->context->tenant();

        // Guests and platform admins have no tenant branch context.
        if (! $user || ! $tenant) {
            return $next($request);
        }

        $branch = $this->resolve($request, $tenant, $user->accessibleBranchIds());

        if ($branch === null) {
            $this->context->setBranchId(null);

            if ($request->hasSession()) {
                $request->session()->forget('active_branch_id');
            }

            return $next($request);
        }

        $this->context->setBranchId($branch->getKey());
        $request->attributes->set('active_branch', $branch);

        if ($request->hasSession() && (int) $request->session()->get('active_branch_id') !== $branch->getKey()) {
            $request->session()->put('active_branch_id', $branch->getKey());
        }

        Log::withContext(['branch_id' => $branch->getKey()]);

        return $next($request);
    }

    /**
     * @param  list<int>  $accessible
     */
    protected function resolve(Request $request, Tenant $tenant, array $accessible): ?Branch
    {
        if ($accessible === []) {
            return null;
        }

        $branches = $tenant->branches()
            ->active()
            ->whereIn('id', $accessible)
            ->orderBy('id')
            ->get();

        if ($branches->isEmpty()) {
            return null;
        }

        $sessionId = $request->hasSession() ? (int) $request->session()->get('active_branch_id') : 0;

        if ($sessionId && ($session = $branches->firstWhere('id', $sessionId))) {
            return $session;
        }

        $primaryId = $tenant->primaryBranch?->getKey();

        if ($primaryId && ($primary = $branches->firstWhere('id', $primaryId))) {
            return $primary;
        }

        return $branches->first();
    }
}
