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
        $this->roles->create($request->user()->tenant, $request->validated(), $request->user());

        return back()->with('success', 'Role created.');
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $this->authorize('update', $role);

        $this->roles->update($request->user()->tenant, $role, $request->validated(), $request->user());

        return back()->with('success', 'Role updated.');
    }

    public function destroy(Request $request, Role $role): RedirectResponse
    {
        $this->authorize('delete', $role);

        $this->roles->delete($request->user()->tenant, $role, $request->user());

        return back()->with('success', 'Role deleted.');
    }
}
