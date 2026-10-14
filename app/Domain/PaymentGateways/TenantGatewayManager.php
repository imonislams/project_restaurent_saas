<?php

namespace App\Domain\PaymentGateways;

use App\Domain\PaymentGateways\Contracts\GatewayDriver;
use App\Domain\PaymentGateways\Drivers\BkashDriver;
use App\Domain\PaymentGateways\Drivers\CashDriver;
use App\Domain\PaymentGateways\Drivers\SslCommerzDriver;
use App\Domain\PaymentGateways\Drivers\StripeDriver;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Resolves a tenant's payment drivers and their stored configuration. A tenant
 * may enable several gateways at once; one is the default. Providers are looked
 * up from the database — never hard-coded into the sale or QR flow.
 */
class TenantGatewayManager
{
    public const PROVIDERS = ['cash', 'stripe', 'sslcommerz', 'bkash'];

    /**
     * Sensible default currencies per provider. Bangladesh rails settle in BDT;
     * cash and Stripe are currency-agnostic.
     *
     * @var array<string, list<string>>
     */
    public const DEFAULT_CURRENCIES = [
        'cash' => [],
        'stripe' => ['USD', 'BDT'],
        'sslcommerz' => ['BDT'],
        'bkash' => ['BDT'],
    ];

    /** @var array<string, array{label: string, fields: list<array{key: string, label: string, secret?: bool, optional?: bool}>}> */
    public const SCHEMA = [
        'cash' => ['label' => 'Cash', 'fields' => []],
        'stripe' => ['label' => 'Stripe', 'fields' => [
            ['key' => 'publishable_key', 'label' => 'Publishable key'],
            ['key' => 'secret_key', 'label' => 'Secret key', 'secret' => true],
            ['key' => 'webhook_secret', 'label' => 'Webhook signing secret', 'secret' => true],
        ]],
        'sslcommerz' => ['label' => 'SSLCommerz (Bangladesh)', 'fields' => [
            ['key' => 'store_id', 'label' => 'Store ID'],
            ['key' => 'store_password', 'label' => 'Store password', 'secret' => true],
        ]],
        'bkash' => ['label' => 'bKash (Bangladesh)', 'fields' => [
            ['key' => 'app_key', 'label' => 'App key'],
            ['key' => 'app_secret', 'label' => 'App secret', 'secret' => true],
            ['key' => 'username', 'label' => 'Username'],
            ['key' => 'password', 'label' => 'Password', 'secret' => true],
        ]],
    ];

    /** @return list<string> */
    public function providers(): array
    {
        return self::PROVIDERS;
    }

    /** @return array<string, array{label: string, fields: list<array<string, mixed>>}> */
    public function schema(): array
    {
        return self::SCHEMA;
    }

    /** @return list<string> */
    public function requiredCredentialKeys(string $provider): array
    {
        return collect(self::SCHEMA[$provider]['fields'] ?? [])->pluck('key')->all();
    }

    /** @return list<string> */
    public function defaultCurrencies(string $provider): array
    {
        return self::DEFAULT_CURRENCIES[$provider] ?? [];
    }

    /**
     * Create or update a tenant's gateways from a submitted set. Gateways not
     * present in the list are disabled (never deleted, so stored credentials
     * survive), and exactly one enabled gateway is left as the default.
     *
     * @param  list<array<string, mixed>>  $gateways
     */
    public function upsertForTenant(Tenant $tenant, array $gateways, ?string $defaultProvider = null): void
    {
        DB::transaction(function () use ($tenant, $gateways, $defaultProvider) {
            TenantGateway::withoutGlobalScopes()
                ->where('tenant_id', $tenant->getKey())
                ->update(['is_enabled' => false, 'is_default' => false]);

            foreach ($gateways as $gateway) {
                $provider = $gateway['provider'] ?? null;

                if (! $provider || ! in_array($provider, self::PROVIDERS, true)) {
                    continue;
                }

                $environment = $gateway['environment'] ?? 'sandbox';
                $supplied = array_filter($gateway['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');

                $row = TenantGateway::withoutGlobalScopes()->firstOrNew([
                    'tenant_id' => $tenant->getKey(),
                    'provider' => $provider,
                    'environment' => $environment,
                ]);

                $row->fill([
                    'name' => $gateway['name'] ?? null,
                    'is_enabled' => (bool) ($gateway['is_enabled'] ?? true),
                    'supported_currencies' => $gateway['supported_currencies'] ?? $this->defaultCurrencies($provider),
                    'credentials' => array_merge($row->credentials ?? [], $supplied),
                    'last_error' => null,
                ]);
                $row->save();
            }

            $this->ensureDefault($tenant, $defaultProvider);
        });
    }

    protected function ensureDefault(Tenant $tenant, ?string $defaultProvider = null): void
    {
        $enabled = TenantGateway::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($enabled->isEmpty()) {
            return;
        }

        $chosen = $defaultProvider ? $enabled->firstWhere('provider', $defaultProvider) : null;
        $chosen ??= $enabled->first();

        TenantGateway::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->update(['is_default' => false]);

        $chosen->forceFill(['is_default' => true])->save();
    }

    public function driver(string $provider): GatewayDriver
    {
        return match ($provider) {
            'stripe' => new StripeDriver,
            'sslcommerz' => new SslCommerzDriver,
            'bkash' => new BkashDriver,
            default => new CashDriver,
        };
    }

    public function driverFor(TenantGateway $config): GatewayDriver
    {
        return $this->driver($config->provider);
    }

    /** @return Collection<int, TenantGateway> */
    public function forTenant(Tenant $tenant): Collection
    {
        return TenantGateway::withoutGlobalScopes()
            ->where('tenant_id', $tenant->getKey())
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    /** @return Collection<int, TenantGateway> */
    public function enabledFor(Tenant $tenant): Collection
    {
        return $this->forTenant($tenant)->where('is_enabled', true)->values();
    }

    public function defaultFor(Tenant $tenant, ?string $currency = null): ?TenantGateway
    {
        $candidates = $this->enabledFor($tenant)
            ->when($currency, fn (Collection $c) => $c->filter(fn (TenantGateway $g) => $g->supports($currency))->values());

        return $candidates->firstWhere('is_default', true) ?? $candidates->first();
    }

    /** The default among enabled gateways that can take an online payment (excludes cash). */
    public function defaultOnlineFor(Tenant $tenant, ?string $currency = null): ?TenantGateway
    {
        $candidates = $this->enabledFor($tenant)
            ->where('provider', '!=', 'cash')
            ->when($currency, fn (Collection $c) => $c->filter(fn (TenantGateway $g) => $g->supports($currency))->values())
            ->values();

        return $candidates->firstWhere('is_default', true) ?? $candidates->first();
    }

    /**
     * Verify a webhook signature against every enabled configuration for a
     * provider. A signature only validates with the right tenant secret, so a
     * match against any configuration is sufficient to accept the event.
     *
     * @param  array<string, mixed>  $payload
     */
    public function verifyAnyEnabled(string $provider, array $payload, ?string $signature): bool
    {
        return TenantGateway::withoutGlobalScopes()
            ->where('provider', $provider)
            ->where('is_enabled', true)
            ->get()
            ->contains(fn (TenantGateway $config) => $this->driverFor($config)->verifyWebhook($config, $payload, $signature));
    }
}
