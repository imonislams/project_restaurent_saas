<?php

namespace App\Domain\Subscriptions;

use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\PlanPrice;
use App\Domain\Subscriptions\Models\Subscription;

/**
 * Resolves plan prices by currency and interval. Prices come from `plan_prices`;
 * the plan's default columns are the fallback for its own default currency.
 */
class PricingService
{
    public function priceFor(Plan $plan, string $currency, BillingCycle $cycle): ?float
    {
        $price = PlanPrice::query()
            ->where('plan_id', $plan->getKey())
            ->where('currency', strtoupper($currency))
            ->where('interval', $cycle->value)
            ->value('price');

        if ($price !== null) {
            return (float) $price;
        }

        if (strtoupper($currency) === strtoupper($plan->currency)) {
            return (float) ($cycle === BillingCycle::Yearly ? $plan->price_yearly : $plan->price_monthly);
        }

        return null;
    }

    /**
     * The price to bill a subscription, in a currency we have a price for.
     *
     * @return array{currency: string, amount: float}
     */
    public function subscriptionPrice(Subscription $subscription): array
    {
        $plan = $subscription->plan;

        // The tenant's billing currency (set in the billing profile), falling
        // back to the region currency captured at onboarding, then the plan's
        // own currency. This is the single source of truth for what a tenant is
        // billed in — the checkout uses exactly this currency.
        $currency = strtoupper((string) (
            $subscription->tenant?->getSetting('billing.currency')
            ?? $subscription->tenant?->getSetting('region.currency')
            ?? $plan?->currency
            ?? 'USD'
        ));

        if (! $plan) {
            return ['currency' => $currency, 'amount' => 0.0];
        }

        $amount = $this->priceFor($plan, $currency, $subscription->billing_cycle);

        if ($amount === null) {
            // No price for the tenant's currency — fall back to the plan's own currency.
            $currency = strtoupper($plan->currency);
            $amount = $this->priceFor($plan, $currency, $subscription->billing_cycle) ?? 0.0;
        }

        return ['currency' => $currency, 'amount' => round($amount, 2)];
    }
}
