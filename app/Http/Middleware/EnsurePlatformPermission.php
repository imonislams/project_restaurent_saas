<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route guard for a single platform permission:
 * ->middleware('platform.permission:platform.tenants.view').
 *
 * Requires both platform-workspace access and the specific granted permission.
 * Platform permissions are resolved from the admin's platform roles — never
 * blanket-granted (see SECURITY.md).
 */
class EnsurePlatformPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        abort_unless($user?->isPlatformAdmin() && $user->hasPermission($permission), 403);

        return $next($request);
    }
}
