<?php

namespace App\Domain\Identity;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;

/**
 * Staff lifecycle operations: access changes, deactivation, session revocation
 * and password resets. Every sensitive action is audited.
 */
class StaffService
{
    public function __construct(protected AuditLogger $audit) {}

    /**
     * @param  list<string>  $roleSlugs
     * @param  list<int>  $branchIds
     */
    public function updateAccess(User $staff, array $roleSlugs, array $branchIds, User $actor): void
    {
        $roleIds = $this->resolvableRoleIds($roleSlugs, $staff->tenant_id);

        $staff->roles()->sync($roleIds);
        $staff->unsetRelation('roles');

        $staff->syncBranchAccess($branchIds);

        $this->audit->log('staff.access_updated', $staff, [
            'roles' => $roleSlugs,
            'branch_ids' => $branchIds,
        ], $actor, $staff->tenant_id);
    }

    public function deactivate(User $staff, User $actor): void
    {
        $staff->forceFill([
            'status' => 'deactivated',
            'deactivated_at' => now(),
        ])->save();

        $this->revokeSessions($staff);

        $this->audit->log('staff.deactivated', $staff, [], $actor, $staff->tenant_id);
    }

    public function reactivate(User $staff, User $actor): void
    {
        $staff->forceFill([
            'status' => 'active',
            'deactivated_at' => null,
        ])->save();

        $this->audit->log('staff.reactivated', $staff, [], $actor, $staff->tenant_id);
    }

    public function revokeSessions(User $staff): void
    {
        DB::table('sessions')->where('user_id', $staff->getKey())->delete();
    }

    public function sendPasswordReset(User $staff, User $actor): void
    {
        Password::sendResetLink(['email' => $staff->email]);

        $this->audit->log('staff.password_reset_sent', $staff, [], $actor, $staff->tenant_id);
    }

    /**
     * Resolves assignable role ids: global tenant roles plus the tenant's own
     * custom roles. Platform roles (and other tenants' roles) are never matched.
     *
     * @param  list<string>  $slugs
     * @return list<int>
     */
    protected function resolvableRoleIds(array $slugs, ?int $tenantId = null): array
    {
        return Role::whereIn('slug', $slugs)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->whereNotIn('slug', RoleName::platformValues())
            ->pluck('id')
            ->all();
    }
}
