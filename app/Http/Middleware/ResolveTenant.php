<?php

namespace App\Http\Middleware;

use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the current tenant from the authenticated user (trusted server-side
 * context) and binds it into the TenantContext singleton.
 */
class ResolveTenant
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->context->forget();

        $user = $request->user();

        if ($user && $user->tenant_id && $tenant = $user->tenant) {
            $this->context->set($tenant);
        }

        // Correlation context for structured logs.
        Log::withContext([
            'tenant_id' => $this->context->tenantId(),
            'user_id' => $user?->getKey(),
        ]);

        return $next($request);
    }
}
