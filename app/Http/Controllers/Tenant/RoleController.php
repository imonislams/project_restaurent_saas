<?php

namespace App\Http\Controllers\Tenant;

use App\Domain\Identity\Models\Role;
use App\Domain\Identity\RoleService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Identity\StoreRoleRequest;
use App\Http\Requests\Identity\UpdateRoleRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    use AuthorizesRequests;

    public function __construct(protected RoleService $roles) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Role::class);

        $tenant = $request->user()->tenant;
        $actor = $request->user();

        return Inertia::render('Roles/Index', [
            'roles' => $this->roles->rolesForTenant($tenant),
            'permission_groups' => $this->roles->permissionCatalog(),
            'grantable' => $this->roles->allowedPermissionSlugs($actor),
            'can_manage' => $actor->hasPermission('roles.manage'),
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $role = $this->roles->create($request->user()->tenant, $request->validated(), $request->user());

        return back()
            ->with('success', 'Role created.')
            ->with('role_id', $role->getKey());
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $this->authorize('update', $role);

        $updated = $this->roles->update($request->user()->tenant, $role, $request->validated(), $request->user());

        return back()
            ->with('success', 'Role updated.')
            ->with('role_id', $updated->getKey());
    }

    public function reset(Request $request, Role $role): RedirectResponse
    {
        $this->authorize('reset', $role);

        $source = $this->roles->resetToDefault($request->user()->tenant, $role, $request->user());

        return back()
            ->with('success', 'Role reset to the system default.')
            ->with('role_id', $source?->getKey());
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        $this->authorize('delete', $role);

        $this->roles->delete($request->user()->tenant, $role, $request->user());

        return back()->with('success', 'Role deleted.');
    }
}
