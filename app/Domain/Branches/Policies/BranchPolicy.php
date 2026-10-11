<?php

namespace App\Domain\Branches\Policies;

use App\Domain\Branches\Models\Branch;
use App\Models\User;

/**
 * Branch authorization. A user may only act on branches within their own tenant.
 */
class BranchPolicy
{
    public function view(User $user, Branch $branch): bool
    {
        return $this->sameTenant($user, $branch);
    }

    public function create(User $user): bool
    {
        return $user->tenant_id !== null && $user->hasPermission('branches.manage');
    }

    public function update(User $user, Branch $branch): bool
    {
        return $this->sameTenant($user, $branch)
            && $user->hasPermission('branches.manage');
    }

    public function delete(User $user, Branch $branch): bool
    {
        return $this->update($user, $branch);
    }

    protected function sameTenant(User $user, Branch $branch): bool
    {
        return $user->tenant_id !== null && $user->tenant_id === $branch->tenant_id;
    }
}
