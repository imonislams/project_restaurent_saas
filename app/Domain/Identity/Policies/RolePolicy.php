<?php

namespace App\Domain\Identity\Policies;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Models\User;

/**
 * Role management authorization. A user may edit roles that belong to their
 * own tenant, and may customise built-in system roles (except the locked
 * owner/admin roles) for their own tenant. Global definitions are never
 * edited or deleted directly from the tenant screen.
 */
class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('roles.view');
    }

    public function view(User $user, Role $role): bool
    {
        return $this->ownsRole($user, $role) && $user->hasPermission('roles.view');
    }

    public function create(User $user): bool
    {
        return $user->tenant_id !== null && $user->hasPermission('roles.manage');
    }

    public function update(User $user, Role $role): bool
    {
        if (! $user->hasPermission('roles.manage')) {
            return false;
        }

        return $this->ownsRole($user, $role) || $this->canCustomizeSystemRole($user, $role);
    }

    public function delete(User $user, Role $role): bool
    {
        return $this->ownsRole($user, $role) && $user->hasPermission('roles.manage');
    }

    public function reset(User $user, Role $role): bool
    {
        return $this->ownsRole($user, $role)
            && $role->isDerived()
            && $user->hasPermission('roles.manage');
    }

    protected function ownsRole(User $user, Role $role): bool
    {
        return $user->tenant_id !== null
            && $role->tenant_id !== null
            && $user->tenant_id === $role->tenant_id
            && ! $role->is_system;
    }

    protected function canCustomizeSystemRole(User $user, Role $role): bool
    {
        return $user->tenant_id !== null
            && $role->tenant_id === null
            && $role->is_system
            && ! $role->isLocked()
            && ! in_array($role->slug, RoleName::platformValues(), true);
    }
}
