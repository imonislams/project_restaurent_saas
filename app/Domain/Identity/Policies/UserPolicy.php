<?php

namespace App\Domain\Identity\Policies;

use App\Models\User;

/**
 * Staff management authorization. Users may only manage staff within their own
 * tenant, and may never deactivate themselves.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('staff.view');
    }

    public function view(User $user, User $model): bool
    {
        return $this->sameTenant($user, $model) && $user->hasPermission('staff.view');
    }

    public function create(User $user): bool
    {
        return $user->tenant_id !== null && $user->hasPermission('staff.manage');
    }

    public function update(User $user, User $model): bool
    {
        return $this->sameTenant($user, $model) && $user->hasPermission('staff.manage');
    }

    public function delete(User $user, User $model): bool
    {
        return $this->sameTenant($user, $model)
            && $user->hasPermission('staff.manage')
            && $user->getKey() !== $model->getKey();
    }

    protected function sameTenant(User $user, User $model): bool
    {
        return $user->tenant_id !== null && $user->tenant_id === $model->tenant_id;
    }
}
