<?php

namespace App\Domain\Realtime;

/**
 * Applies the stored real-time provider over the file/env broadcasting config at
 * boot, so the platform can switch between Reverb and Pusher from the UI.
 *
 * "Off" (or an incomplete driver) resolves to the null broadcaster — never to
 * "log", which would fill the log with every event payload.
 */
class BroadcastConfigurator
{
    public function __construct(protected RealtimeManager $realtime) {}

    public function apply(): void
    {
        if (! $this->realtime->enabled()) {
            config(['broadcasting.default' => 'null']);

            return;
        }

        $driver = $this->realtime->activeDriver();
        $credentials = $this->realtime->credentials($driver);
        $scheme = strtolower((string) ($credentials['scheme'] ?? 'https')) === 'http' ? 'http' : 'https';

        $options = match ($driver) {
            'pusher' => array_filter([
                'cluster' => $credentials['cluster'] ?? 'mt1',
                'host' => $credentials['host'] ?? 'api-'.($credentials['cluster'] ?? 'mt1').'.pusher.com',
                'port' => (int) ($credentials['port'] ?? 443),
                'scheme' => $scheme,
                'encrypted' => true,
                'useTLS' => $scheme === 'https',
            ], fn ($value) => $value !== null && $value !== ''),
            'reverb' => array_filter([
                'host' => $credentials['host'] ?? null,
                'port' => (int) ($credentials['port'] ?? 443),
                'scheme' => $scheme,
                'useTLS' => $scheme === 'https',
            ], fn ($value) => $value !== null && $value !== ''),
            default => [],
        };

        config([
            'broadcasting.default' => 'platform',
            'broadcasting.connections.platform' => [
                'driver' => $driver,
                'key' => $credentials['key'] ?? null,
                'secret' => $credentials['secret'] ?? null,
                'app_id' => $credentials['app_id'] ?? null,
                'options' => $options,
            ],
        ]);

        if ($driver === 'reverb') {
            // Reverb's own server reads its app credentials separately; keep them in
            // sync with the ones saved here so `reverb:start` needs no .env editing.
            $app = (array) config('reverb.apps.apps.0', []);

            config([
                'reverb.apps.apps' => [array_merge($app, [
                    'key' => $credentials['key'] ?? null,
                    'secret' => $credentials['secret'] ?? null,
                    'app_id' => $credentials['app_id'] ?? null,
                    'options' => array_merge((array) ($app['options'] ?? []), $options),
                ])],
            ]);
        }
    }
}
