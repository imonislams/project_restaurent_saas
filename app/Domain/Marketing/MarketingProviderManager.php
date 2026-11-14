<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Contracts\MarketingProvider;
use Illuminate\Contracts\Container\Container;

/**
 * Resolves provider drivers from the container.
 *
 * Drivers are bound under `marketing.provider.{key}`, which keeps the core free of
 * hard-wired provider classes and lets a test bind a stub driver. A provider with
 * no bound driver is reported honestly rather than silently treated as working.
 */
class MarketingProviderManager
{
    public function __construct(protected Container $container) {}

    public function driver(string $key): ?MarketingProvider
    {
        $abstract = 'marketing.provider.'.$key;

        if (! $this->container->bound($abstract)) {
            return null;
        }

        $driver = $this->container->make($abstract);

        return $driver instanceof MarketingProvider ? $driver : null;
    }

    public function hasDriver(string $key): bool
    {
        return $this->driver($key) !== null;
    }

    /** @return list<string> Registry keys that currently have a driver installed. */
    public function installed(): array
    {
        return array_values(array_filter(
            MarketingIntegrationRegistry::keys(),
            fn (string $key) => $this->hasDriver($key),
        ));
    }
}
