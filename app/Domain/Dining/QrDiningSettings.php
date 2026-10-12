<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Enums\BillingMode;
use App\Domain\Tenancy\TenantContext;

/**
 * Typed access to the tenant's `qr.*` settings with safe defaults. Every value
 * is read server-side from the tenant settings JSON so the frontend can never
 * become the authorization boundary.
 */
class QrDiningSettings
{
    public function __construct(protected TenantContext $context) {}

    public function enabled(): bool
    {
        return (bool) $this->get('qr.enabled', true);
    }

    /** @return list<int> */
    public function enabledBranchIds(): array
    {
        $ids = $this->get('qr.branch_ids', []);

        return is_array($ids) ? array_map('intval', $ids) : [];
    }

    public function branchEnabled(int $branchId): bool
    {
        $ids = $this->enabledBranchIds();

        return $ids === [] || in_array($branchId, $ids, true);
    }

    public function guestCheckout(): bool
    {
        return (bool) $this->get('qr.guest_checkout', true);
    }

    public function requirePhone(): bool
    {
        return (bool) $this->get('qr.require_phone', false);
    }

    public function requireEmail(): bool
    {
        return (bool) $this->get('qr.require_email', false);
    }

    public function sessionTimeoutMinutes(): int
    {
        return max(15, (int) $this->get('qr.session_timeout_minutes', 180));
    }

    public function autoAccept(): bool
    {
        return (bool) $this->get('qr.auto_accept', true);
    }

    public function allowAdditionalOrders(): bool
    {
        return (bool) $this->get('qr.allow_additional_orders', true);
    }

    public function allowNotes(): bool
    {
        return (bool) $this->get('qr.allow_notes', true);
    }

    public function allowCustomerCancel(): bool
    {
        return (bool) $this->get('qr.allow_cancel', false);
    }

    public function liveTracking(): bool
    {
        return (bool) $this->get('qr.live_tracking', true);
    }

    /** @return array<string, string> */
    public function statusLabels(): array
    {
        $labels = $this->get('qr.status_labels', []);

        return is_array($labels) ? $labels : [];
    }

    public function allowBillRequest(): bool
    {
        return (bool) $this->get('qr.allow_bill_request', true);
    }

    public function billingMode(): BillingMode
    {
        $value = $this->get('qr.billing_mode', BillingMode::Consolidated->value);

        return BillingMode::tryFrom((string) $value) ?? BillingMode::Consolidated;
    }

    public function digitalReceipt(): bool
    {
        return (bool) $this->get('qr.digital_receipt', true);
    }

    public function feedbackEnabled(): bool
    {
        return (bool) $this->get('qr.feedback', true);
    }

    public function loyaltyEnabled(): bool
    {
        return (bool) $this->get('qr.loyalty', false);
    }

    /** @return list<string> */
    public function paymentMethods(): array
    {
        $methods = $this->get('qr.payment_methods', ['cash']);

        return is_array($methods) ? array_values($methods) : ['cash'];
    }

    protected function get(string $key, mixed $default = null): mixed
    {
        $value = $this->context->tenant()?->getSetting($key, null);

        return $value ?? $default;
    }
}
