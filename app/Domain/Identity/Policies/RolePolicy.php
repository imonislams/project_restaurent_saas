<?php

namespace App\Domain\Identity\Policies;

use App\Domain\Identity\Models\Role;
use App\Models\User;

/**
 * Custom role management authorization. A user may only view, edit or delete
 * roles that belong to their own tenant — global/system roles are managed by
 * the platform role screen and are never editable here.
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
        return $this->ownsRole($user, $role) && $user->hasPermission('roles.manage');
    }

    public function delete(User $user, Role $role): bool
    {
        return $this->ownsRole($user, $role) && $user->hasPermission('roles.manage');
    }

    protected function ownsRole(User $user, Role $role): bool
    {
        return $user->tenant_id !== null
            && $role->tenant_id !== null
            && $user->tenant_id === $role->tenant_id
            && ! $role->is_system;
    }
}
