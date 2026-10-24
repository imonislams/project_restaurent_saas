<?php

namespace App\Domain\Billing;

use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\Enums\PlanRegion;
use App\Domain\Tenancy\Models\Tenant;

/**
 * The visitor's resolved pricing region for the current request. Set by
 * ResolvePricingRegion from a manual choice (session), a trusted country
 * header, or the configured default.
 *
 * This drives *display only* — never billing facts or gateway eligibility,
 * which are resolved from the tenant's billing profile.
 */
class PricingRegionContext
{
    protected ?string $region = null;

    protected string $source = 'default';

    protected ?string $country = null;

    public function set(string $region, string $source = 'default', ?string $country = null): void
    {
        $this->region = $region;
        $this->source = $source;
        $this->country = $country !== null ? strtoupper(trim($country)) : null;
    }

    public function has(): bool
    {
        return $this->region !== null;
    }

    public function region(): string
    {
        return $this->region ?? $this->defaultRegion();
    }

    public function source(): string
    {
        return $this->source;
    }

    /** The detected ISO-2 country, when known (header or browser detection). */
    public function country(): ?string
    {
        return $this->country;
    }

    public function forget(): void
    {
        $this->region = null;
        $this->source = 'default';
    }

    /**
     * The fallback region when no country can be detected, in priority order:
     * the admin setting, an explicit env/config value, then the platform's
     * default currency (BDT ⇒ Bangladesh).
     */
    public function defaultRegion(): string
    {
        $configured = $this->configuredDefaultRegion();

        if ($configured !== null && in_array($configured, PlanRegion::selectable(), true)) {
            return $configured;
        }

        return $this->defaultCurrency() === 'BDT'
            ? PlanRegion::Bangladesh->value
            : PlanRegion::International->value;
    }

    protected function configuredDefaultRegion(): ?string
    {
        try {
            $setting = app(PlatformSettings::class)->get('billing.default_pricing_region');
        } catch (\Throwable) {
            $setting = null;
        }

        $value = $setting ?: config('platform.pricing.default_region');

        return is_string($value) && trim($value) !== '' ? strtolower(trim($value)) : null;
    }

    protected function defaultCurrency(): string
    {
        try {
            $settings = app(PlatformSettings::class);
            $currency = $settings->get('billing.default_currency') ?? $settings->get('general.default_currency');
        } catch (\Throwable) {
            $currency = null;
        }

        return strtoupper((string) ($currency ?? config('platform.reporting_currency', 'USD')));
    }

    /**
     * Region options for a switcher, from config.
     *
     * @return list<array{value: string, label: string}>
     */
    public function options(): array
    {
        return collect(PlanRegion::selectable())
            ->map(fn (string $value) => [
                'value' => $value,
                'label' => (string) config("platform.pricing.regions.{$value}.label", ucfirst($value)),
            ])
            ->values()
            ->all();
    }

    /** The display currency associated with a region. */
    public function currencyFor(string $region): string
    {
        return strtoupper((string) config(
            "platform.pricing.regions.{$region}.currency",
            config('platform.reporting_currency', 'USD'),
        ));
    }

    /** Resolve an ISO-2 country code to a region. Unknown ⇒ default region. */
    public function regionForCountry(?string $country): string
    {
        $country = $country !== null ? strtoupper(trim($country)) : '';

        if ($country === '') {
            return $this->defaultRegion();
        }

        foreach ((array) config('platform.pricing.regions', []) as $region => $meta) {
            $codes = array_map('strtoupper', (array) ($meta['country_codes'] ?? []));

            if ($codes !== [] && in_array($country, $codes, true)) {
                return (string) $region;
            }
        }

        return PlanRegion::International->value;
    }

    /**
     * The pricing region that applies to a tenant: their billing currency picks
     * the ladder (BDT ⇒ Bangladesh), falling back to their billing/region
     * country, then the default region.
     */
    public function regionForTenant(Tenant $tenant): string
    {
        $currency = strtoupper((string) (
            $tenant->getSetting('billing.currency')
            ?? $tenant->getSetting('region.currency')
            ?? ''
        ));

        if ($currency !== '') {
            foreach ((array) config('platform.pricing.regions', []) as $region => $meta) {
                if (strtoupper((string) ($meta['currency'] ?? '')) === $currency) {
                    return (string) $region;
                }
            }
        }

        return $this->regionForCountry(
            $tenant->getSetting('billing.country') ?? $tenant->getSetting('region.country')
        );
    }
}
