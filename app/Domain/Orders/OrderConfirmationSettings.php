<?php

namespace App\Domain\Orders;

use App\Domain\Tenancy\TenantContext;

/**
 * Typed access to the tenant's `orders.*` confirmation settings with safe
 * defaults. Read server-side from the tenant settings JSON so the frontend can
 * never become the authorization boundary.
 */
class OrderConfirmationSettings
{
    public const MODE_CENTRAL = 'central';

    public const MODE_DIRECT = 'direct';

    public function __construct(protected TenantContext $context) {}

    /**
     * Order confirmation mode: `central` (approval required) or `direct`
     * (authorized staff confirm immediately). Defaults to `central` so staff
     * orders await confirmation unless an owner explicitly opts into direct
     * branch order-taking.
     */
    public function mode(): string
    {
        $value = (string) $this->get('orders.staff_confirmation_mode', self::MODE_CENTRAL);

        return in_array($value, [self::MODE_CENTRAL, self::MODE_DIRECT], true)
            ? $value
            : self::MODE_CENTRAL;
    }

    public function isCentralApproval(): bool
    {
        return $this->mode() === self::MODE_CENTRAL;
    }

    /** Whether branch staff may take orders without central approval. */
    public function branchDirectOrderTaking(): bool
    {
        return (bool) $this->get('orders.branch_direct_order_taking', false);
    }

    /** Whether confirmed orders are dispatched to the kitchen. */
    public function sendConfirmedToKitchen(): bool
    {
        return (bool) $this->get('orders.send_confirmed_to_kitchen', true);
    }

    /**
     * Whether an order taken by restricted service staff must await central
     * approval (central mode, or direct branch order-taking turned off).
     */
    public function centralApprovalRequired(): bool
    {
        return $this->isCentralApproval() || ! $this->branchDirectOrderTaking();
    }

    protected function get(string $key, mixed $default = null): mixed
    {
        $value = $this->context->tenant()?->getSetting($key, null);

        return $value ?? $default;
    }
}
