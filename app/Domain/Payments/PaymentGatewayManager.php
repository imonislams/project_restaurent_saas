<?php

namespace App\Domain\Payments;

use App\Domain\PaymentGateways\ConfiguredGateway;
use App\Domain\PaymentGateways\TenantGatewayManager;
use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Payments\Gateways\ManualGateway;
use App\Domain\Payments\Gateways\StubGateway;
use App\Domain\Tenancy\TenantContext;

/**
 * Resolves the payment gateway for a tenant from the server-side setting
 * (never from the client). When a tenant has configured a real gateway it is
 * preferred; otherwise the manual/stub default is used.
 */
class PaymentGatewayManager
{
    public function __construct(protected TenantContext $context) {}

    public function for(?string $provider = null): PaymentGateway
    {
        $tenant = $this->context->tenant();

        if ($tenant !== null) {
            $manager = app(TenantGatewayManager::class);
            $config = $provider !== null
                ? $manager->enabledFor($tenant)->firstWhere('provider', $provider)
                : $manager->defaultOnlineFor($tenant);

            if ($config !== null) {
                return new ConfiguredGateway($manager->driverFor($config), $config);
            }
        }

        $provider ??= $tenant?->getSetting('payments.provider', 'manual') ?? 'manual';

        return match ($provider) {
            'stub' => new StubGateway,
            default => new ManualGateway,
        };
    }
}
