<?php

namespace App\Domain\Identity;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Manager PIN approvals for sensitive actions (voids, refunds, overrides, cash
 * discrepancies). Actual enforcement points arrive with POS/refund workflows.
 */
class ManagerPinService
{
    public const MIN_LENGTH = 4;

    /** Failed PIN attempts allowed before a cooling-off period. */
    public const MAX_ATTEMPTS = 5;

    /** Seconds a locked-out user must wait before trying again. */
    public const LOCKOUT_SECONDS = 300;

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
     *
     * A PIN is a short, low-entropy credential guarding voids, refunds and cash
     * overrides, so guessing it must cost something: failures are counted per
     * (tenant, user) and the caller is locked out for a cooling-off period once
     * the limit is reached. A successful approval clears the counter.
     */
    public function verify(Tenant $tenant, string $pin): ?User
    {
        $user = auth()->user();
        $key = $this->throttleKey($tenant, $user);

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            $this->audit->log('approval.pin_locked_out', null, [
                'attempts' => self::MAX_ATTEMPTS,
                'retry_after' => RateLimiter::availableIn($key),
            ], $user, $tenant->getKey());

            return null;
        }

        $candidates = $tenant->users()
            ->whereNotNull('manager_pin')
            ->where('status', 'active')
            ->get();

        foreach ($candidates as $candidate) {
            if (! $this->canApprove($candidate)) {
                continue;
            }

            if (Hash::check($pin, $candidate->manager_pin)) {
                RateLimiter::clear($key);

                $this->audit->log('approval.pin_verified', $candidate, [], $candidate, $tenant->getKey());

                return $candidate;
            }
        }

        RateLimiter::hit($key, self::LOCKOUT_SECONDS);

        $this->audit->log('approval.pin_failed', null, [
            'attempts_left' => max(0, self::MAX_ATTEMPTS - RateLimiter::attempts($key)),
        ], $user, $tenant->getKey());

        return null;
    }

    /**
     * Whether PIN entry is currently locked out for this tenant and user.
     */
    public function isLockedOut(Tenant $tenant): bool
    {
        return RateLimiter::tooManyAttempts(
            $this->throttleKey($tenant, auth()->user()),
            self::MAX_ATTEMPTS,
        );
    }

    /**
     * Seconds until a locked-out user may try again.
     */
    public function retryAfter(Tenant $tenant): int
    {
        return RateLimiter::availableIn($this->throttleKey($tenant, auth()->user()));
    }

    protected function throttleKey(Tenant $tenant, ?User $user): string
    {
        return 'manager-pin:'.$tenant->getKey().':'.($user?->getKey() ?? 'guest');
    }
}
