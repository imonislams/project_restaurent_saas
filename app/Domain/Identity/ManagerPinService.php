<?php

namespace App\Domain\Identity;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Manager PIN approvals for sensitive actions (voids, refunds, overrides, cash
 * discrepancies). Actual enforcement points arrive with POS/refund workflows.
 */
class ManagerPinService
{
    public const MIN_LENGTH = 4;

    /** @var list<string> */
    protected const APPROVAL_PERMISSIONS = [
        'orders.void',
        'orders.refund',
        'cash.approve',
        'expenses.approve',
        'inventory.approve',
        'purchasing.approve',
        'waste.approve',
    ];

    public function __construct(protected AuditLogger $audit) {}

    public function set(User $user, string $pin): void
    {
        $user->forceFill(['manager_pin' => Hash::make($pin)])->save();

        $this->audit->log('user.manager_pin_set', $user, [], $user);
    }

    public function clear(User $user): void
    {
        $user->forceFill(['manager_pin' => null])->save();

        $this->audit->log('user.manager_pin_cleared', $user, [], $user);
    }

    public function hasPin(User $user): bool
    {
        return $user->manager_pin !== null;
    }

    public function canApprove(User $user): bool
    {
        if ($user->isPlatformAdmin()) {
            return false;
        }

        foreach (self::APPROVAL_PERMISSIONS as $permission) {
            if ($user->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolve the approving manager for a tenant by PIN, or null on failure.
     * A failed attempt is audited for security review.
     */
    public function verify(Tenant $tenant, string $pin): ?User
    {
        $candidates = $tenant->users()
            ->whereNotNull('manager_pin')
            ->where('status', 'active')
            ->get();

        foreach ($candidates as $candidate) {
            if (! $this->canApprove($candidate)) {
                continue;
            }

            if (Hash::check($pin, $candidate->manager_pin)) {
                $this->audit->log('approval.pin_verified', $candidate, [], $candidate, $tenant->getKey());

                return $candidate;
            }
        }

        $this->audit->log('approval.pin_failed', null, [], null, $tenant->getKey());

        return null;
    }
}
