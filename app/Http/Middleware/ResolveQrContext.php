<?php

namespace App\Http\Middleware;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the public QR token into a tenant/branch/table context.
 *
 * The token is the only trusted input; the tenant is bound server-side from it
 * (never from a client field), so every subsequent query stays correctly
 * scoped even though the request is unauthenticated.
 */
class ResolveQrContext
{
    public function __construct(protected TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) $request->route('token');

        $qr = TableQrToken::query()
            ->withoutGlobalScope('tenant')
            ->where('token', $token)
            ->first();

        if (! $qr || ! $qr->isUsable()) {
            abort(410, 'This QR code is no longer valid. Please ask the staff for help.');
        }

        $tenant = Tenant::query()->find($qr->tenant_id);
        $branch = Branch::query()->withoutGlobalScope('tenant')->find($qr->branch_id);
        $table = Table::query()->withoutGlobalScope('tenant')->find($qr->table_id);

        if (! $tenant || ! $tenant->canAccess() || ! $branch || ! $branch->is_active || ! $table || ! $table->is_active) {
            abort(404);
        }

        $this->context->set($tenant);
        $this->context->setBranchId($branch->getKey());

        $qr->forceFill([
            'scan_count' => (int) $qr->scan_count + 1,
            'last_scanned_at' => now(),
        ])->save();

        $request->attributes->set('qr_token', $qr);
        $request->attributes->set('qr_tenant', $tenant);
        $request->attributes->set('qr_branch', $branch);
        $request->attributes->set('qr_table', $table);

        return $next($request);
    }
}
