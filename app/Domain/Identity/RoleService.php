<?php

namespace App\Domain\Identity;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Tenant-scoped custom role management.
 *
 * Custom roles are ordinary `roles` rows with a non-null `tenant_id` and
 * `is_system = false`. The existing global roles (tenant_id = null) remain the
 * fixed, system-defined catalogue and are never editable or deletable here.
 */
class RoleService
{
    public function __construct(protected AuditLogger $audit) {}

    /**
     * Roles visible to a tenant: the global non-platform roles plus the tenant's
     * own custom roles. Assigned users are always limited to this tenant, so a
     * global role shared by many tenants never leaks another tenant's users.
     *
     * @return list<array<string, mixed>>
     */
    public function rolesForTenant(Tenant $tenant): array
    {
        $membership = DB::table('role_user')
            ->join('users', 'users.id', '=', 'role_user.user_id')
            ->where('users.tenant_id', $tenant->getKey())
            ->select('role_user.role_id', 'users.id', 'users.name', 'users.email')
            ->get()
            ->groupBy('role_id');

        return Role::query()
            ->where(function ($query) use ($tenant) {
                $query->whereNull('tenant_id')->orWhere('tenant_id', $tenant->getKey());
            })
            ->whereNotIn('slug', RoleName::platformValues())
            ->with('permissions:id,slug')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get()
            ->map(function (Role $role) use ($membership) {
                $users = $membership->get($role->getKey(), collect());

                return [
                    'id' => $role->getKey(),
                    'name' => $role->name,
                    'slug' => $role->slug,
                    'description' => $role->description,
                    'is_system' => (bool) $role->is_system,
                    'is_custom' => $role->tenant_id !== null,
                    'permissions' => $role->permissions->pluck('slug')->all(),
                    'users' => $users->map(fn ($user) => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Tenant permissions grouped by functional area, for the selection UI.
     *
     * @return list<array{group: string, label: string, permissions: list<array{value: string, label: string}>}>
     */
    public function permissionCatalog(): array
    {
        $map = Permissions::map();
        unset($map['platform']);

        $catalog = [];

        foreach ($map as $group => $actions) {
            $catalog[] = [
                'group' => $group,
                'label' => Str::headline($group),
                'permissions' => array_map(
                    fn (string $action) => ['value' => $group.'.'.$action, 'label' => Str::headline($action)],
                    $actions,
                ),
            ];
        }

        return $catalog;
    }

    /**
     * Permissions the acting user may grant: the tenant permissions they hold.
     * This prevents privilege escalation through a custom role.
     *
     * @return list<string>
     */
    public function allowedPermissionSlugs(User $actor): array
    {
        return array_values(array_intersect(Permissions::tenant(), $actor->allPermissions()->all()));
    }

    /**
     * @param  array{name: string, description?: ?string, permissions?: list<string>}  $data
     */
    public function create(Tenant $tenant, array $data, User $actor): Role
    {
        $name = trim((string) $data['name']);
        $this->guardName($tenant, $name);
        $permissions = $this->validatePermissions($data['permissions'] ?? [], $actor);

        return DB::transaction(function () use ($tenant, $name, $data, $permissions, $actor) {
            $role = Role::create([
                'tenant_id' => $tenant->getKey(),
                'name' => $name,
                'slug' => $this->uniqueSlug($tenant, $name),
                'description' => $data['description'] ?? null,
                'is_system' => false,
            ]);

            $role->permissions()->sync($this->permissionIds($permissions));

            $this->audit->log('role.created', $role, [
                'name' => $role->name,
                'permissions' => $permissions,
            ], $actor, $tenant->getKey());

            return $role->load('permissions:id,slug');
        });
    }

    /**
     * @param  array{name: string, description?: ?string, permissions?: list<string>}  $data
     */
    public function update(Tenant $tenant, Role $role, array $data, User $actor): Role
    {
        $this->guardManaged($tenant, $role);

        $name = trim((string) $data['name']);
        $this->guardName($tenant, $name, $role->getKey());
        $permissions = $this->validatePermissions($data['permissions'] ?? [], $actor);

        return DB::transaction(function () use ($tenant, $role, $name, $data, $permissions, $actor) {
            $before = $role->permissions()->pluck('slug')->all();

            $role->forceFill([
                'name' => $name,
                'description' => $data['description'] ?? null,
            ])->save();

            $role->permissions()->sync($this->permissionIds($permissions));

            $this->audit->logChange(
                'role.permissions_updated',
                $role,
                ['name' => $role->name, 'permissions' => $before],
                ['name' => $role->name, 'permissions' => $permissions],
                $actor,
                $tenant->getKey(),
            );

            return $role->load('permissions:id,slug');
        });
    }

    public function delete(Tenant $tenant, Role $role, User $actor): void
    {
        $this->guardManaged($tenant, $role);

        $assigned = $role->users()->where('users.tenant_id', $tenant->getKey())->count();

        if ($assigned > 0) {
            throw ValidationException::withMessages([
                'role' => "This role is still assigned to {$assigned} user(s). Reassign them before deleting it.",
            ]);
        }

        DB::transaction(function () use ($tenant, $role, $actor) {
            $snapshot = [
                'name' => $role->name,
                'slug' => $role->slug,
                'permissions' => $role->permissions()->pluck('slug')->all(),
            ];

            $role->permissions()->detach();
            $role->delete();

            $this->audit->log('role.deleted', null, $snapshot, $actor, $tenant->getKey());
        });
    }

    /**
     * Only the tenant's own, non-system roles may be edited or deleted.
     */
    protected function guardManaged(Tenant $tenant, Role $role): void
    {
        abort_unless($role->tenant_id === $tenant->getKey(), 404);
        abort_if($role->is_system, 403, 'System roles cannot be modified.');
        abort_if(in_array($role->slug, RoleName::platformValues(), true), 404);
    }

    protected function guardName(Tenant $tenant, string $name, ?int $ignoreId = null): void
    {
        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'A role name is required.']);
        }

        $exists = Role::query()
            ->where('name', $name)
            ->where(function ($query) use ($tenant) {
                $query->whereNull('tenant_id')->orWhere('tenant_id', $tenant->getKey());
            })
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['name' => 'A role with this name already exists.']);
        }
    }

    /**
     * A slug that is free among the global roles and the tenant's own roles.
     */
    protected function uniqueSlug(Tenant $tenant, string $name): string
    {
        $base = Str::slug($name) ?: 'role';
        $slug = $base;
        $suffix = 2;

        while (Role::query()
            ->where('slug', $slug)
            ->where(function ($query) use ($tenant) {
                $query->whereNull('tenant_id')->orWhere('tenant_id', $tenant->getKey());
            })
            ->exists()) {
            $slug = $base.'-'.$suffix++;
        }

        return $slug;
    }

    /**
     * Validate granted slugs against the registry and the actor's own scope.
     *
     * @param  list<string>  $slugs
     * @return list<string>
     */
    protected function validatePermissions(array $slugs, User $actor): array
    {
        $slugs = array_values(array_unique(array_filter(
            $slugs,
            fn ($slug) => is_string($slug) && $slug !== '',
        )));

        $rejected = array_values(array_diff($slugs, $this->allowedPermissionSlugs($actor)));

        if ($rejected !== []) {
            throw ValidationException::withMessages([
                'permissions' => 'You cannot grant permissions you do not hold: '.implode(', ', $rejected).'.',
            ]);
        }

        return $slugs;
    }

    /**
     * @param  list<string>  $slugs
     * @return list<int>
     */
    protected function permissionIds(array $slugs): array
    {
        if ($slugs === []) {
            return [];
        }

        return Permission::query()->whereIn('slug', $slugs)->pluck('id')->all();
    }
}
