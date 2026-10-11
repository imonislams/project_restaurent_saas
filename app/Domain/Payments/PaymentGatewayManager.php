<?php

namespace App\Domain\Payments;

use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Payments\Gateways\ManualGateway;
use App\Domain\Payments\Gateways\StubGateway;
use App\Domain\Tenancy\TenantContext;

/**
 * Resolves the payment gateway for a tenant from the server-side setting
 * (never from the client).
 */
class PaymentGatewayManager
{
    public function __construct(protected TenantContext $context) {}

    public function for(?string $provider = null): PaymentGateway
    {
        $provider ??= $this->context->tenant()?->getSetting('payments.provider', 'manual') ?? 'manual';

        return match ($provider) {
            'stub' => new StubGateway,
            default => new ManualGateway,
        };
    }
}
