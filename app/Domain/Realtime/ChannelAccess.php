<?php

namespace App\Domain\Realtime;

use App\Models\User;

/**
 * Authorises broadcast channels. Every area maps to the permission that already
 * gates the screen it feeds, so the socket can never show more than the page.
 */
class ChannelAccess
{
    /** Tenant area => required permission (null = any member of the tenant). */
    public const TENANT = [
        'approvals' => 'orders.approve',
        'kitchen' => 'kitchen.view',
        'orders' => 'orders.view',
        'billing' => 'invoices.view',
        'inventory' => 'inventory.view',
        'dashboard' => null,
    ];

    /** Platform area => required platform permission. */
    public const PLATFORM = [
        'payments' => 'platform.payments.view',
        'tenants' => 'platform.tenants.view',
        'ops' => 'platform.monitoring.view',
        'security' => 'platform.security.view',
        'support' => 'platform.support.view',
    ];

    public static function tenant(User $user, int $tenantId, ?string $permission = null): bool
    {
        if ((int) $user->tenant_id !== $tenantId) {
            return false;
        }

        return $permission === null || $user->hasPermission($permission);
    }

    public static function platform(User $user, string $permission): bool
    {
        return $user->isPlatformAdmin() && $user->hasPermission($permission);
    }
}
