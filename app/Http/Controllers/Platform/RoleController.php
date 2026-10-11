<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Permissions;
use App\Domain\Security\SecurityEventLogger;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function __construct(
        protected AuditLogger $audit,
        protected SecurityEventLogger $events,
    ) {}

    public function index(): Response
    {
        $roles = Role::query()
            ->whereNull('tenant_id')
            ->whereIn('slug', RoleName::platformValues())
            ->with('permissions:id,slug')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->getKey(),
                'name' => $role->name,
                'slug' => $role->slug,
                'permissions' => $role->permissions->pluck('slug')->all(),
                'locked' => $role->slug === RoleName::SaasSuperAdmin->value,
            ]);

        return Inertia::render('Platform/Security/Roles', [
            'roles' => $roles,
            'permissions' => collect(Permissions::platform())
                ->map(fn (string $slug) => ['value' => $slug, 'label' => $slug])
                ->values()
                ->all(),
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_unless($role->tenant_id === null && in_array($role->slug, RoleName::platformValues(), true), 404);
        abort_if($role->slug === RoleName::SaasSuperAdmin->value, 422, 'The SaaS super admin role is locked and cannot be edited.');

        $data = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::in(Permissions::platform())],
        ]);

        $before = $role->permissions()->pluck('slug')->all();
        $after = array_values($data['permissions'] ?? []);

        $role->permissions()->sync(Permission::query()->whereIn('slug', $after)->pluck('id')->all());

        $this->audit->logChange('platform.role_permissions_updated', $role, ['permissions' => $before], ['permissions' => $after], $request->user());
        $this->events->record('platform_role_permissions_updated', $request->user(), null, ['role' => $role->slug]);

        return back()->with('success', 'Role permissions updated.');
    }
}
