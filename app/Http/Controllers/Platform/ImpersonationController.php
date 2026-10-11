<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Time-limited, reason-required, fully audited support impersonation. The
 * impersonated user is a real tenant user, so tenant isolation is preserved.
 */
class ImpersonationController extends Controller
{
    public function __construct(protected AuditLogger $audit) {}

    public function start(Request $request, Tenant $tenant): RedirectResponse
    {
        abort_unless(app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('features.impersonation', true), 403, 'Support impersonation is disabled.');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $admin = $request->user();

        // Never impersonate a tenant that cannot be accessed — the tenant gate
        // would immediately log the session out and strand the admin.
        abort_unless($tenant->canAccess(), 422, 'This tenant is not active; reactivate it before impersonating.');

        $target = $tenant->users()
            ->whereHas('roles', fn ($q) => $q->where('slug', 'tenant_owner'))
            ->first() ?? $tenant->users()->orderBy('id')->first();

        abort_if($target === null, 422, 'This tenant has no users to impersonate.');

        $request->session()->put([
            'impersonator_id' => $admin->getKey(),
            'impersonating_tenant_id' => $tenant->getKey(),
        ]);

        $this->audit->log('platform.impersonation_started', $tenant, [
            'reason' => $data['reason'],
            'as' => $target->email,
        ], $admin, $tenant->getKey());

        Auth::login($target);

        return redirect()->route('dashboard')
            ->with('success', 'You are now impersonating '.$tenant->name.'.');
    }

    public function stop(Request $request): RedirectResponse
    {
        $adminId = $request->session()->pull('impersonator_id');
        $tenantId = $request->session()->pull('impersonating_tenant_id');

        abort_if($adminId === null, 403);

        $admin = User::query()->findOrFail($adminId);

        $this->audit->log('platform.impersonation_stopped', null, [], $admin, $tenantId);

        Auth::login($admin);

        return redirect()->route('platform.tenants.index')
            ->with('success', 'Impersonation ended.');
    }
}
