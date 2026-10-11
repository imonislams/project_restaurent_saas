<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Security\SecurityEventLogger;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function __construct(
        protected AuditLogger $audit,
        protected SecurityEventLogger $events,
    ) {}

    public function index(): Response
    {
        $admins = User::query()
            ->where('is_platform_admin', true)
            ->with('roles:id,name,slug')
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->getKey(),
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'roles' => $user->roles->pluck('name')->all(),
                'role_slugs' => $user->roles->pluck('slug')->all(),
                'last_login_at' => $user->last_login_at?->toIso8601String(),
                'sessions' => DB::table('sessions')->where('user_id', $user->getKey())->count(),
                'is_self' => auth()->id() === $user->getKey(),
            ]);

        return Inertia::render('Platform/Security/Admins', [
            'admins' => $admins,
            'roles' => $this->platformRoles(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', Rule::in(RoleName::platformValues())],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_platform_admin' => true,
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $user->syncRoles($data['roles']);

        $this->audit->log('platform.admin_created', $user, [
            'email' => $user->email,
            'roles' => $data['roles'],
        ], $request->user());

        $this->events->record('platform_admin_created', $request->user(), null, ['admin' => $user->email]);

        return back()->with('success', 'Platform administrator created.');
    }

    public function update(Request $request, User $admin): RedirectResponse
    {
        abort_unless($admin->isPlatformAdmin(), 404);

        $data = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', Rule::in(RoleName::platformValues())],
        ]);

        $before = $admin->roles()->pluck('slug')->all();
        $admin->syncRoles($data['roles']);

        $this->audit->logChange('platform.admin_roles_updated', $admin, ['roles' => $before], ['roles' => $data['roles']], $request->user());
        $this->events->record('platform_admin_roles_updated', $request->user(), null, ['admin' => $admin->email]);

        return back()->with('success', 'Administrator roles updated.');
    }

    public function deactivate(Request $request, User $admin): RedirectResponse
    {
        abort_unless($admin->isPlatformAdmin(), 404);
        abort_if($admin->getKey() === $request->user()->getKey(), 422, 'You cannot deactivate your own account.');

        $admin->forceFill(['status' => 'deactivated', 'deactivated_at' => now()])->save();
        DB::table('sessions')->where('user_id', $admin->getKey())->delete();

        $this->audit->log('platform.admin_deactivated', $admin, ['email' => $admin->email], $request->user());
        $this->events->record('platform_admin_deactivated', $request->user(), null, ['admin' => $admin->email]);

        return back()->with('success', 'Administrator deactivated and sessions revoked.');
    }

    public function reactivate(Request $request, User $admin): RedirectResponse
    {
        abort_unless($admin->isPlatformAdmin(), 404);

        $admin->forceFill(['status' => 'active', 'deactivated_at' => null])->save();

        $this->audit->log('platform.admin_reactivated', $admin, ['email' => $admin->email], $request->user());

        return back()->with('success', 'Administrator reactivated.');
    }

    public function revokeSessions(Request $request, User $admin): RedirectResponse
    {
        abort_unless($admin->isPlatformAdmin(), 404);

        DB::table('sessions')->where('user_id', $admin->getKey())->delete();

        $this->audit->log('platform.admin_sessions_revoked', $admin, ['email' => $admin->email], $request->user());

        return back()->with('success', 'Administrator sessions revoked.');
    }

    /** @return list<array{value: string, label: string}> */
    protected function platformRoles(): array
    {
        return Role::query()
            ->whereNull('tenant_id')
            ->whereIn('slug', RoleName::platformValues())
            ->orderBy('name')
            ->get(['id', 'name', 'slug'])
            ->map(fn (Role $role) => ['value' => $role->slug, 'label' => $role->name])
            ->all();
    }
}
