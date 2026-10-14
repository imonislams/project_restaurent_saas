<?php

namespace App\Domain\Communications\Sms;

use App\Domain\Communications\Sms\Contracts\SmsProvider;
use App\Domain\Communications\Sms\Providers\BulkSmsBdProvider;
use App\Domain\Communications\Sms\Providers\LogSmsProvider;
use App\Domain\Communications\Sms\Providers\SslWirelessSmsProvider;
use App\Domain\Communications\Sms\Providers\TwilioSmsProvider;
use App\Domain\PlatformSettings\PlatformSettings;

/**
 * Resolves the active SMS driver from platform settings. Multiple providers are
 * shipped; a platform administrator selects one and supplies its credentials.
 * Credentials are stored encrypted at rest and never returned to the frontend.
 */
class SmsManager
{
    public const PROVIDERS = ['log', 'ssl_wireless', 'bulksmsbd', 'twilio'];

    /** @var array<string, array{label: string, fields: list<array{key: string, label: string, secret?: bool}>}> */
    public const SCHEMA = [
        'log' => ['label' => 'Log (development)', 'fields' => []],
        'ssl_wireless' => ['label' => 'SSL Wireless (Bangladesh)', 'fields' => [
            ['key' => 'api_token', 'label' => 'API token', 'secret' => true],
            ['key' => 'sid', 'label' => 'Store ID (sid)'],
            ['key' => 'sender_id', 'label' => 'Sender ID / mask'],
            ['key' => 'endpoint', 'label' => 'Endpoint URL', 'secret' => false],
        ]],
        'bulksmsbd' => ['label' => 'BulkSMSBD (Bangladesh)', 'fields' => [
            ['key' => 'api_key', 'label' => 'API key', 'secret' => true],
            ['key' => 'sender_id', 'label' => 'Sender ID'],
            ['key' => 'endpoint', 'label' => 'Endpoint URL', 'secret' => false],
        ]],
        'twilio' => ['label' => 'Twilio', 'fields' => [
            ['key' => 'account_sid', 'label' => 'Account SID'],
            ['key' => 'auth_token', 'label' => 'Auth token', 'secret' => true],
            ['key' => 'from', 'label' => 'From number'],
        ]],
    ];

    public function __construct(protected PlatformSettings $settings) {}

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

    public function activeDriver(): string
    {
        $driver = (string) ($this->settings->get('sms.driver') ?? 'log');

        return in_array($driver, self::PROVIDERS, true) ? $driver : 'log';
    }

    /** Credential keys required for a driver to be usable. */
    public function requiredCredentialKeys(string $driver): array
    {
        return collect(self::SCHEMA[$driver]['fields'] ?? [])
            ->reject(fn (array $field) => in_array($field['key'], ['endpoint'], true))
            ->pluck('key')
            ->all();
    }

    /** @return array<string, mixed> */
    public function credentials(string $driver): array
    {
        return (array) $this->settings->get("sms.credentials.{$driver}", []);
    }

    /** Credential keys present for a driver, without exposing values. */
    public function credentialKeys(string $driver): array
    {
        return array_keys(array_filter($this->credentials($driver), fn ($value) => $value !== null && $value !== ''));
    }

    public function isConfigured(string $driver): bool
    {
        if ($driver === 'log') {
            return true;
        }

        return array_diff($this->requiredCredentialKeys($driver), $this->credentialKeys($driver)) === [];
    }

    public function resolve(string $driver): SmsProvider
    {
        $credentials = $this->credentials($driver);

        return match ($driver) {
            'ssl_wireless' => new SslWirelessSmsProvider($credentials),
            'bulksmsbd' => new BulkSmsBdProvider($credentials),
            'twilio' => new TwilioSmsProvider($credentials),
            default => new LogSmsProvider,
        };
    }

    public function driver(): SmsProvider
    {
        return $this->resolve($this->activeDriver());
    }

    /**
     * @return array{ok: bool, reference: ?string, error: ?string}
     */
    public function send(string $to, string $message): array
    {
        try {
            return $this->driver()->send($to, $message);
        } catch (\Throwable $e) {
            return ['ok' => false, 'reference' => null, 'error' => $e->getMessage()];
        }
    }

    /** Persist the active driver. */
    public function setDriver(string $driver): void
    {
        $this->settings->set('sms.driver', $driver, 'sms');
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

        $this->settings->set("sms.credentials.{$driver}", $merged, 'sms', encrypted: true);
    }
}
