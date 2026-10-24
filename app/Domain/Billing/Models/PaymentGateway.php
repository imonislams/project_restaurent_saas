<?php

namespace App\Domain\Billing\Models;

use App\Domain\Billing\Enums\GatewayEnvironment;
use App\Domain\PaymentGateways\GatewayProviderRegistry;
use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A platform payment gateway configuration. Multiple named configurations are
 * supported (e.g. several SSLCommerz accounts). Credentials are encrypted at
 * rest and never returned in full to the frontend.
 */
class PaymentGateway extends Model
{
    protected $fillable = [
        'name',
        'provider',
        'environment',
        'is_enabled',
        'is_default',
        'sort_order',
        'supported_currencies',
        'credentials',
        'settings',
        'health_status',
        'last_ok_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'environment' => GatewayEnvironment::class,
            'is_enabled' => 'boolean',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
            'supported_currencies' => 'array',
            'credentials' => 'encrypted:array',
            'settings' => 'array',
            'last_ok_at' => 'datetime',
        ];
    }

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'payment_gateway_plan', 'payment_gateway_id', 'plan_id')
            ->withTimestamps();
    }

    public function supports(string $currency): bool
    {
        $currencies = $this->supported_currencies ?? [];

        return $currencies === [] || in_array(strtoupper($currency), array_map('strtoupper', $currencies), true);
    }

    /** Credential keys present, without exposing their values. */
    public function credentialKeys(): array
    {
        return array_keys($this->credentials ?? []);
    }

    public function setting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings, $key, $default);
    }

    /**
     * ISO-2 country codes this gateway is available in. Empty = all countries.
     *
     * @return list<string>
     */
    public function allowedCountries(): array
    {
        return collect((array) $this->setting('allowed_countries', []))
            ->map(fn ($code) => strtoupper(trim((string) $code)))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Payment capabilities this configuration exposes (card, mobile_wallet,
     * bank, ...). Empty = no capability restriction.
     *
     * @return list<string>
     */
    public function capabilities(): array
    {
        $capabilities = (array) $this->setting('capabilities', []);

        return $capabilities === []
            ? app(GatewayProviderRegistry::class)->capabilities($this->provider)
            : array_values($capabilities);
    }

    /** Whether every required credential for the provider has been supplied. */
    public function hasRequiredCredentials(): bool
    {
        $required = app(GatewayProviderRegistry::class)->requiredCredentialKeys($this->provider);

        return array_diff($required, $this->credentialKeys()) === [];
    }

    /**
     * A configuration is production-ready once its credentials are complete and
     * its last health check passed. It is never shown as ready before then.
     */
    public function isReady(): bool
    {
        return $this->hasRequiredCredentials() && $this->health_status === 'ok';
    }

    public function displayName(): string
    {
        return $this->name ?: ucfirst($this->provider).' ('.$this->environment->value.')';
    }
}
