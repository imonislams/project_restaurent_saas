<?php

namespace App\Domain\Tenancy\Policies;

use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;

/**
 * Tenant-scoped authorization. A tenant user may only act on their own tenant.
 */
class TenantPolicy
{
    public function view(User $user, Tenant $tenant): bool
    {
        return $this->belongsToTenant($user, $tenant);
    }

    public function update(User $user, Tenant $tenant): bool
    {
        return $this->belongsToTenant($user, $tenant)
            && $user->hasPermission('settings.manage');
    }

    public function manage(User $user, Tenant $tenant): bool
    {
        return $this->update($user, $tenant);
    }

    protected function belongsToTenant(User $user, Tenant $tenant): bool
    {
        return $user->tenant_id !== null && $user->tenant_id === $tenant->getKey();
    }
}
