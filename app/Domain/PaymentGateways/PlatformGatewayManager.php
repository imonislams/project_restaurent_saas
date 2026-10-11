<?php

namespace App\Domain\PaymentGateways;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\Contracts\PlatformGateway;
use App\Domain\PaymentGateways\Gateways\ManualGateway;
use App\Domain\PaymentGateways\Gateways\SslCommerzGateway;
use Illuminate\Support\Collection;

/**
 * Resolves gateway drivers and their stored configuration. Multiple named
 * configurations are supported and several may be enabled at once. Providers are
 * looked up from the database — never hard-coded into billing logic.
 */
class PlatformGatewayManager
{
    public const PROVIDERS = ['manual', 'sslcommerz'];

    /** @return list<string> */
    public function providers(): array
    {
        return self::PROVIDERS;
    }

    public function driver(string $provider): PlatformGateway
    {
        return match ($provider) {
            'sslcommerz' => new SslCommerzGateway(),
            default => new ManualGateway(),
        };
    }

    public function driverFor(PaymentGateway $config): PlatformGateway
    {
        return $this->driver($config->provider);
    }

    /** @return Collection<int, PaymentGateway> */
    public function all(): Collection
    {
        return PaymentGateway::query()->orderBy('provider')->orderBy('sort_order')->orderBy('id')->get();
    }

    /** @return Collection<int, PaymentGateway> */
    public function enabledConfigs(): Collection
    {
        return $this->all()->where('is_enabled', true)->values();
    }

    /** Enabled configurations that support a given currency. @return Collection<int, PaymentGateway> */
    public function forCurrency(string $currency): Collection
    {
        return $this->enabledConfigs()->filter(fn (PaymentGateway $config) => $config->supports($currency))->values();
    }

    /** The preferred enabled configuration for a currency (default first). */
    public function defaultFor(string $currency): ?PaymentGateway
    {
        $candidates = $this->forCurrency($currency);

        return $candidates->firstWhere('is_default', true) ?? $candidates->first();
    }

    public function config(string $provider, ?string $environment = null): ?PaymentGateway
    {
        return PaymentGateway::query()
            ->where('provider', $provider)
            ->when($environment !== null, fn ($q) => $q->where('environment', $environment))
            ->where('is_enabled', true)
            ->orderByDesc('is_default')
            ->orderBy('sort_order')
            ->first();
    }

    /** A specific enabled configuration, or null if disabled/unknown. */
    public function enabledConfig(int $id): ?PaymentGateway
    {
        return PaymentGateway::query()->whereKey($id)->where('is_enabled', true)->first();
    }

    /** Backwards-compatible helper: an enabled config for provider + currency. */
    public function enabled(string $provider, string $currency): ?PaymentGateway
    {
        return $this->forCurrency($currency)->firstWhere('provider', $provider);
    }
}
