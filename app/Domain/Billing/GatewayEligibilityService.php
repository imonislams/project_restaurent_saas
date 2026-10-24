<?php

namespace App\Domain\Billing;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Single source of truth for which gateways a tenant may use at checkout.
 *
 * Rules are evaluated from the tenant's billing profile (country) and the
 * gateway's configured availability — never from IP geolocation. A gateway is
 * eligible when it is enabled, supports the currency, permits the tenant's
 * country, and (when it declares a plan mapping) supports the plan.
 */
class GatewayEligibilityService
{
    public function __construct(protected PlatformGatewayManager $gateways) {}

    /**
     * @return Collection<int, PaymentGateway>
     */
    public function eligibleFor(Tenant $tenant, ?Plan $plan, string $currency, ?string $capability = null): Collection
    {
        $country = $this->countryFor($tenant);
        $planMappings = $this->planMappings();

        return $this->gateways->forCurrency($currency)
            ->filter(fn (PaymentGateway $config) => $this->passesCountry($config, $country)
                && $this->supportsPlan($config, $plan, $planMappings)
                && $this->supportsCapability($config, $capability))
            ->values();
    }

    /**
     * The tenant's billing country, falling back to the region captured at
     * onboarding. Uppercased ISO-2 code, or null when unknown.
     */
    public function countryFor(Tenant $tenant): ?string
    {
        $country = $tenant->getSetting('billing.country')
            ?? $tenant->getSetting('region.country');

        return $country ? strtoupper((string) $country) : null;
    }

    /** Whether a specific configuration is eligible for the tenant/plan/currency. */
    public function isEligible(Tenant $tenant, PaymentGateway $config, ?Plan $plan, string $currency): bool
    {
        return $this->eligibleFor($tenant, $plan, $currency)->contains(fn (PaymentGateway $c) => $c->getKey() === $config->getKey());
    }

    protected function passesCountry(PaymentGateway $config, ?string $country): bool
    {
        $allowed = $config->allowedCountries();

        if ($allowed === []) {
            return true;
        }

        if ($country === null) {
            // A country restriction is configured but the tenant's country is
            // unknown — fail closed rather than offer an ineligible gateway.
            return false;
        }

        return in_array($country, $allowed, true);
    }

    /**
     * @param  Collection<int, Collection<int, object>>  $planMappings
     */
    protected function supportsPlan(PaymentGateway $config, ?Plan $plan, Collection $planMappings): bool
    {
        if ($plan === null) {
            return true;
        }

        $planIds = $planMappings->get($config->getKey(), collect())->pluck('plan_id')->all();

        // No mapping declared means the gateway is available to every plan.
        return $planIds === [] || in_array($plan->getKey(), $planIds, true);
    }

    protected function supportsCapability(PaymentGateway $config, ?string $capability): bool
    {
        if ($capability === null) {
            return true;
        }

        $capabilities = $config->capabilities();

        return $capabilities === [] || in_array($capability, $capabilities, true);
    }

    /**
     * All plan mappings, keyed by gateway id, in one query (avoids N+1).
     *
     * @return Collection<int, Collection<int, object>>
     */
    protected function planMappings(): Collection
    {
        return DB::table('payment_gateway_plan')
            ->get(['payment_gateway_id', 'plan_id'])
            ->groupBy('payment_gateway_id');
    }
}
