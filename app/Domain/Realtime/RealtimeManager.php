<?php

namespace App\Domain\Realtime;

use App\Domain\PlatformSettings\PlatformSettings;

/**
 * Resolves the platform's real-time (websocket) provider from platform settings.
 *
 * Reverb is self-hosted and Pusher is a cloud service; both speak the Pusher
 * protocol, so one browser client serves either one. Credentials are encrypted
 * at rest, and only the public values (key / endpoint) are ever shared with the
 * browser — never the secret or the app id.
 */
class RealtimeManager
{
    public const DRIVERS = ['off', 'reverb', 'pusher'];

    /** @var array<string, array{label: string, description: string, fields: list<array<string, mixed>>}> */
    public const SCHEMA = [
        'off' => [
            'label' => 'Off — no real-time pushes',
            'description' => 'Everything keeps working on the normal refresh; nothing is pushed.',
            'fields' => [],
        ],
        'pusher' => [
            'label' => 'Pusher (cloud)',
            'description' => 'Cloud websockets — nothing to install or keep running, works on shared hosting.',
            'fields' => [
                ['key' => 'app_id', 'label' => 'App ID'],
                ['key' => 'key', 'label' => 'Key (public)'],
                ['key' => 'secret', 'label' => 'Secret', 'secret' => true],
                ['key' => 'cluster', 'label' => 'Cluster', 'optional' => true],
                ['key' => 'host', 'label' => 'Host override', 'optional' => true],
                ['key' => 'port', 'label' => 'Port', 'optional' => true],
                ['key' => 'scheme', 'label' => 'Scheme (https / http)', 'optional' => true],
            ],
        ],
        'reverb' => [
            'label' => 'Reverb (self-hosted)',
            'description' => 'Your own websocket server. Needs a process that stays up and a reachable secure port.',
            'fields' => [
                ['key' => 'app_id', 'label' => 'App ID'],
                ['key' => 'key', 'label' => 'App key (public)'],
                ['key' => 'secret', 'label' => 'App secret', 'secret' => true],
                ['key' => 'host', 'label' => 'Host'],
                ['key' => 'port', 'label' => 'Port', 'optional' => true],
                ['key' => 'scheme', 'label' => 'Scheme (https / http)', 'optional' => true],
            ],
        ],
    ];

    /** Alert streams an administrator can silence without a deploy. */
    public const STREAMS = [
        'staff' => [
            'label' => 'Staff alerts',
            'description' => 'New QR order awaiting approval, kitchen ticket opened, ready / handed over, order status changes.',
        ],
        'platform' => [
            'label' => 'Platform Admin alerts',
            'description' => 'Manual payment awaiting approval, payment settled or rejected, new tenant, failed jobs, failed logins, support tickets.',
        ],
        'customer' => [
            'label' => 'Customer QR tracking',
            'description' => 'The diner’s tracking page updates instantly instead of every 8 seconds.',
        ],
        'billing' => [
            'label' => 'Billing & dashboard',
            'description' => 'Online payment received, bill requested, low stock at the moment of sale, live dashboard counters.',
        ],
    ];

    public function __construct(protected PlatformSettings $settings) {}

    /** @return list<string> */
    public function drivers(): array
    {
        return self::DRIVERS;
    }

    /** @return array<string, array<string, mixed>> */
    public function schema(): array
    {
        return self::SCHEMA;
    }

    /** @return array<string, array<string, mixed>> */
    public function streams(): array
    {
        return self::STREAMS;
    }

    public function activeDriver(): string
    {
        $driver = (string) ($this->settings->get('realtime.driver') ?? 'off');

        return in_array($driver, self::DRIVERS, true) ? $driver : 'off';
    }

    /** @return list<string> */
    public function requiredCredentialKeys(string $driver): array
    {
        return collect(self::SCHEMA[$driver]['fields'] ?? [])
            ->reject(fn (array $field) => (bool) ($field['optional'] ?? false))
            ->pluck('key')
            ->all();
    }

    /** @return array<string, mixed> */
    public function credentials(string $driver): array
    {
        return (array) $this->settings->get("realtime.credentials.{$driver}", []);
    }

    /** Credential keys present for a driver, without exposing values. @return list<string> */
    public function credentialKeys(string $driver): array
    {
        return array_keys(array_filter($this->credentials($driver), fn ($value) => $value !== null && $value !== ''));
    }

    public function isConfigured(string $driver): bool
    {
        if (! in_array($driver, self::DRIVERS, true)) {
            return false;
        }

        if ($driver === 'off') {
            return true;
        }

        return array_diff($this->requiredCredentialKeys($driver), $this->credentialKeys($driver)) === [];
    }

    /** Whether pushes are actually delivered: a real driver with complete credentials. */
    public function enabled(): bool
    {
        $driver = $this->activeDriver();

        return $driver !== 'off' && $this->isConfigured($driver);
    }

    public function streamEnabled(string $stream): bool
    {
        $streams = $this->settings->get('realtime.streams');

        if (! is_array($streams)) {
            return true;
        }

        return (bool) ($streams[$stream] ?? true);
    }

    public function setStream(string $stream, bool $enabled): void
    {
        $streams = (array) ($this->settings->get('realtime.streams') ?? []);
        $streams[$stream] = $enabled;

        $this->settings->set('realtime.streams', $streams, 'realtime');
    }

    public function setDriver(string $driver): void
    {
        $this->settings->set('realtime.driver', $driver, 'realtime');
    }

    /**
     * Persist credentials for a driver (encrypted). Only supplied values are
     * merged, so masked fields left blank keep their previous value.
     *
     * @param  array<string, mixed>  $credentials
     */
    public function setCredentials(string $driver, array $credentials): void
    {
        $supplied = array_filter($credentials, fn ($value) => $value !== null && $value !== '');

        $merged = array_merge($this->credentials($driver), $supplied);

        $this->settings->set("realtime.credentials.{$driver}", $merged, 'realtime', encrypted: true);
    }

    /**
     * The connection values the browser needs — public values only.
     *
     * @return array<string, mixed>
     */
    public function publicConfig(): array
    {
        $driver = $this->activeDriver();

        if (! $this->enabled()) {
            return ['driver' => 'off'];
        }

        $credentials = $this->credentials($driver);
        $scheme = strtolower((string) ($credentials['scheme'] ?? 'https')) === 'http' ? 'http' : 'https';

        return array_filter([
            'driver' => $driver,
            'key' => $credentials['key'] ?? null,
            'cluster' => $credentials['cluster'] ?? null,
            'host' => $credentials['host'] ?? null,
            'port' => isset($credentials['port']) && $credentials['port'] !== '' ? (int) $credentials['port'] : null,
            'scheme' => $scheme,
        ], fn ($value) => $value !== null && $value !== '');
    }
}
