<?php

namespace App\Http\Controllers\Staff;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\InvitationService;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\StaffService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreInvitationRequest;
use App\Http\Requests\Staff\UpdateStaffRequest;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected InvitationService $invitations,
        protected StaffService $staff,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $tenant = $request->user()->tenant;
        $actor = $request->user();

        return Inertia::render('Staff/Index', [
            'staff' => $tenant->users()
                ->with(['roles', 'branches'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->getKey(),
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'is_active' => $user->isActive(),
                    'is_self' => $user->getKey() === $actor->getKey(),
                    'last_login_at' => $user->last_login_at?->toIso8601String(),
                    'roles' => $user->roles->pluck('slug')->all(),
                    'role_labels' => $user->roles->pluck('name')->all(),
                    'branch_ids' => $user->branches->pluck('id')->all(),
                    'branch_names' => $user->branches->pluck('name')->all(),
                    'has_pin' => $user->hasManagerPin(),
                ]),
            'invitations' => $tenant->invitations()
                ->pending()
                ->latest()
                ->get()
                ->map(fn (Invitation $invitation) => [
                    'id' => $invitation->getKey(),
                    'email' => $invitation->email,
                    'name' => $invitation->name,
                    'roles' => $invitation->roles,
                    'branch_ids' => $invitation->branch_ids ?? [],
                    'expires_at' => $invitation->expires_at->toIso8601String(),
                ]),
            'roles' => $this->roleOptions($actor->tenant_id),
            'branches' => $tenant->branches()->whereIn('id', $request->user()->accessibleBranchIds())->active()->orderBy('name')->get()
                ->map(fn ($branch) => ['id' => $branch->getKey(), 'name' => $branch->name]),
        ]);
    }

    public function store(StoreInvitationRequest $request): RedirectResponse
    {
        $this->invitations->invite(
            $request->user()->tenant,
            $request->validated(),
            $request->user(),
        );

        return back()->with('success', 'Invitation sent.');
    }

    public function update(UpdateStaffRequest $request, User $staff): RedirectResponse
    {
        $this->authorize('update', $staff);

        $this->staff->updateAccess(
            $staff,
            $request->validated('roles'),
            $request->validated('branch_ids') ?? [],
            $request->user(),
        );

        return back()->with('success', 'Access updated.');
    }

    public function deactivate(Request $request, User $staff): RedirectResponse
    {
        $this->authorize('update', $staff);
        abort_if($staff->getKey() === $request->user()->getKey(), 403, 'You cannot deactivate your own account.');

        $this->staff->deactivate($staff, $request->user());

        return back()->with('success', 'Staff member deactivated.');
    }

    public function reactivate(Request $request, User $staff): RedirectResponse
    {
        $this->authorize('update', $staff);

        $this->staff->reactivate($staff, $request->user());

        return back()->with('success', 'Staff member reactivated.');
    }

    public function revokeSessions(Request $request, User $staff): RedirectResponse
    {
        $this->authorize('update', $staff);

        $this->staff->revokeSessions($staff);

        return back()->with('success', 'Sessions revoked.');
    }

    public function sendPasswordReset(Request $request, User $staff): RedirectResponse
    {
        $this->authorize('update', $staff);

        $this->staff->sendPasswordReset($staff, $request->user());

        return back()->with('success', 'Password reset link sent.');
    }

    public function resendInvitation(Invitation $invitation): RedirectResponse
    {
        $this->authorize('create', User::class);

        $this->invitations->resend($invitation);

        return back()->with('success', 'Invitation resent.');
    }

    public function destroyInvitation(Invitation $invitation): RedirectResponse
    {
        $this->authorize('create', User::class);

        $this->invitations->revoke($invitation);

        return back()->with('success', 'Invitation revoked.');
    }

    /**
     * Assignable roles: global tenant roles plus the tenant's own custom roles.
     *
     * @return Collection<int, array{value: string, label: string}>
     */
    protected function roleOptions(?int $tenantId): Collection
    {
        return Role::query()
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->whereNotIn('slug', RoleName::platformValues())
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => ['value' => $role->slug, 'label' => $role->name]);
    }
}
