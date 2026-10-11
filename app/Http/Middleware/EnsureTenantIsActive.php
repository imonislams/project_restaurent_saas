<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks tenant users whose tenant is suspended, archived or missing.
 *
 * Platform admins are exempt: their access is governed separately and they do
 * not operate inside a tenant context.
 */
class EnsureTenantIsActive
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isPlatformAdmin()) {
            return $next($request);
        }

        $tenant = $this->context->tenant();

        if ($user->tenant_id && ! $tenant) {
            return $this->deny($request, 'Your account is not linked to an active restaurant.');
        }

        if ($tenant && ! $tenant->canAccess()) {
            $message = $tenant->status === TenantStatus::Suspended
                ? 'This restaurant account is suspended. Please contact support.'
                : 'This restaurant account is no longer active.';

            return $this->deny($request, $message);
        }

        return $next($request);
    }

    protected function deny(Request $request, string $message): Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()
            ->route('login')
            ->withErrors(['email' => $message]);
    }
}
