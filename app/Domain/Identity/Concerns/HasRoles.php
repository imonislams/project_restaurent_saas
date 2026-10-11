<?php

namespace App\Domain\Identity\Concerns;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

trait HasRoles
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withPivot('branch_id')
            ->withTimestamps();
    }

    public function assignRole(Role|RoleName|string $role): void
    {
        $this->roles()->syncWithoutDetaching([$this->resolveRoleId($role)]);
        $this->unsetRelation('roles');
    }

    /**
     * @param  array<int, Role|RoleName|string>  $roles
     */
    public function syncRoles(array $roles): void
    {
        $ids = collect($roles)->map(fn ($role) => $this->resolveRoleId($role))->all();
        $this->roles()->sync($ids);
        $this->unsetRelation('roles');
    }

    public function hasRole(RoleName|string|array $roles): bool
    {
        $slugs = collect(is_array($roles) ? $roles : [$roles])
            ->map(fn ($role) => $role instanceof RoleName ? $role->value : $role);

        return $this->roles->whereIn('slug', $slugs)->isNotEmpty();
    }

    /**
     * Whether the user holds the given permission.
     *
     * Permissions are resolved from the user's assigned roles — for both tenant
     * users and platform admins. Platform admins resolve platform.* permissions
     * from their platform roles and never gain tenant business permissions
     * (three-access separation, see SECURITY.md). Use isPlatformAdmin() for the
     * workspace gate; use this for the action gate.
     */
    public function hasPermission(string $permission): bool
    {
        return $this->allPermissions()->contains($permission);
    }

    /**
     * @return Collection<int, string>
     */
    public function allPermissions(): Collection
    {
        return $this->roles
            ->loadMissing('permissions')
            ->flatMap(fn (Role $role) => $role->permissions->pluck('slug'))
            ->unique()
            ->values();
    }

    public function isPlatformAdmin(): bool
    {
        return (bool) $this->is_platform_admin;
    }

    protected function resolveRoleId(Role|RoleName|string $role): int
    {
        if ($role instanceof Role) {
            return $role->getKey();
        }

        $slug = $role instanceof RoleName ? $role->value : $role;

        return Role::where('slug', $slug)->whereNull('tenant_id')->value('id')
            ?? Role::where('slug', $slug)->value('id')
            ?? throw new \RuntimeException("Role [{$slug}] is not defined.");
    }
}
