<?php

namespace App\Domain\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Contracts\DispatchesMarketingEvents;
use App\Domain\Marketing\Enums\ConsentCategory;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\IntegrationStatus;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingEventDelivery;
use App\Domain\Marketing\Models\MarketingIntegration;
use App\Domain\Marketing\Models\MarketingSyncLog;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Configuration and health for every external marketing provider.
 *
 * Credential handling follows the PaymentGateway contract exactly: values are
 * encrypted by the model's `encrypted:array` cast, a blank field keeps the stored
 * value, and only credential *key names* ever leave the server. Status is earned by
 * a successful test or sync — never set because a field was filled in.
 */
class MarketingIntegrationService
{
    public function __construct(
        protected MarketingProviderManager $providers,
        protected AuditLogger $audit,
    ) {}

    /**
     * Every registry provider with its stored configuration, for the UI.
     *
     * @return list<array<string, mixed>>
     */
    public function configuration(): array
    {
        return array_map(
            fn (string $provider) => $this->row($provider),
            MarketingIntegrationRegistry::keys(),
        );
    }

    /**
     * A single provider's row, whether or not it has been configured yet.
     *
     * @return array<string, mixed>
     */
    public function row(string $provider): array
    {
        $schema = MarketingIntegrationRegistry::get($provider) ?? [];
        $integration = $this->forProvider($provider);
        $driverInstalled = $this->providers->hasDriver($provider);

        $credentials = [];

        foreach (MarketingIntegrationRegistry::credentialFields($provider) as $key => $field) {
            $credentials[] = [
                'key' => $key,
                'label' => $field['label'],
                'type' => $field['type'] ?? 'text',
                'secret' => (bool) ($field['secret'] ?? false),
                'required' => (bool) ($field['required'] ?? false),
                'help' => $field['help'] ?? null,
                // Set/not set only. A value is never returned, not even masked.
                'is_set' => $integration !== null && $this->hasCredential($integration, $key),
            ];
        }

        $status = $integration?->status ?? IntegrationStatus::NotConfigured;

        return [
            'provider' => $provider,
            'label' => $schema['label'] ?? $provider,
            'description' => $schema['description'] ?? '',
            'group' => $schema['group'] ?? 'other',
            'docs' => $schema['docs'] ?? null,
            'consent' => $schema['consent'] ?? null,
            'dispatches_events' => (bool) ($schema['dispatches_events'] ?? false),
            'syncs_data' => (bool) ($schema['syncs_data'] ?? false),
            'driver_installed' => $driverInstalled,
            'is_configured' => $this->forProvider($provider) !== null,
            'is_enabled' => (bool) ($integration?->is_enabled ?? false),
            'status' => $status->value,
            'status_label' => $status->label(),
            'status_tone' => $status->tone(),
            'health_status' => $integration?->health_status ?? 'unknown',
            'last_ok_at' => $integration?->last_ok_at?->toIso8601String(),
            'last_synced_at' => $integration?->last_synced_at?->toIso8601String(),
            'last_error' => $integration?->last_error,
            'last_error_at' => $integration?->last_error_at?->toIso8601String(),
            'settings' => $integration?->settings ?? [],
            'credentials' => $credentials,
        ];
    }

    /**
     * A compact status summary, used by the dashboard's "tracking is not
     * connected" notice.
     *
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $rows = $this->configuration();

        $connected = [];
        $configured = [];
        $notConfigured = [];

        foreach ($rows as $row) {
            if ($row['status'] === IntegrationStatus::Connected->value) {
                $connected[] = $row['provider'];
            } elseif ($row['status'] === IntegrationStatus::NotConfigured->value) {
                $notConfigured[] = $row['provider'];
            } else {
                $configured[] = $row['provider'];
            }
        }

        return [
            'any_connected' => $connected !== [],
            'connected' => $connected,
            'configured' => $configured,
            'not_configured' => $notConfigured,
            'drivers_installed' => $this->providers->installed(),
            'providers' => $rows,
        ];
    }

    public function forProvider(string $provider, ?string $environment = null): ?MarketingIntegration
    {
        $environment ??= $this->defaultEnvironment();

        return MarketingIntegration::query()
            ->where('provider', $provider)
            ->where('environment', $environment)
            ->first();
    }

    public function ensure(string $provider, ?string $environment = null): MarketingIntegration
    {
        $environment ??= $this->defaultEnvironment();

        return MarketingIntegration::query()->firstOrCreate(
            ['provider' => $provider, 'environment' => $environment],
            [
                'name' => MarketingIntegrationRegistry::label($provider),
                'is_enabled' => false,
                'status' => IntegrationStatus::NotConfigured,
                'health_status' => 'unknown',
            ],
        );
    }

    /**
     * Store credentials and settings. A blank credential keeps the stored value, so
     * saving one field never wipes the others.
     *
     * @param  array<string, mixed>  $credentials
     * @param  array<string, mixed>  $settings
     * @param  list<string>  $remove  credential keys to delete
     */
    public function save(
        string $provider,
        array $credentials = [],
        array $settings = [],
        array $remove = [],
        ?User $actor = null,
    ): MarketingIntegration {
        $integration = $this->ensure($provider);

        $existing = is_array($integration->credentials) ? $integration->credentials : [];
        $changed = [];

        foreach ($credentials as $key => $value) {
            if ($value === null || (is_string($value) && trim($value) === '')) {
                continue;
            }

            $existing[(string) $key] = is_string($value) ? trim($value) : $value;
            $changed[] = (string) $key;
        }

        foreach ($remove as $key) {
            unset($existing[(string) $key]);
        }

        $integration->fill([
            'credentials' => $existing,
            'settings' => array_merge($integration->settings ?? [], $settings),
        ]);

        // Changing credentials invalidates a previous verification.
        $integration->status = $this->resolveStatus($integration);
        $integration->save();

        // Key names only — never a value.
        $this->audit->log('marketing.integration_updated', $integration, [
            'provider' => $provider,
            'credential_keys_changed' => $changed,
            'credential_keys_removed' => array_values($remove),
            'enabled' => $integration->is_enabled,
        ], $actor);

        return $integration;
    }

    public function setEnabled(string $provider, bool $enabled, ?User $actor = null): MarketingIntegration
    {
        $integration = $this->ensure($provider);
        $integration->is_enabled = $enabled;

        // Enabling recomputes the status from what is actually known: switched on
        // with no verification yet is "configured, not verified"; switched on with a
        // previous successful test is still verified, so it returns to connected
        // rather than forcing a pointless re-test.
        $integration->status = match (true) {
            ! $this->hasRequiredCredentials($integration) => IntegrationStatus::NotConfigured,
            ! $enabled => IntegrationStatus::Disabled,
            $integration->last_ok_at !== null && $integration->health_status === 'ok' => IntegrationStatus::Connected,
            default => IntegrationStatus::Configured,
        };

        $integration->save();

        $this->audit->log('marketing.integration_toggled', $integration, [
            'provider' => $provider,
            'enabled' => $enabled,
        ], $actor);

        return $integration;
    }

    /**
     * Prove a connection really works. A provider without an installed driver is
     * reported honestly rather than reported as working.
     *
     * @return array{ok: bool, error: ?string, status: string, detail: array<string, mixed>}
     */
    public function test(string $provider, ?User $actor = null): array
    {
        $label = MarketingIntegrationRegistry::label($provider);
        $integration = $this->forProvider($provider);

        if ($integration === null) {
            return [
                'ok' => false,
                'error' => $label.' has not been configured yet.',
                'status' => IntegrationStatus::NotConfigured->value,
                'detail' => [],
            ];
        }

        $driver = $this->providers->driver($provider);

        if ($driver === null) {
            return [
                'ok' => false,
                'error' => 'The '.$label.' driver is not installed yet, so the connection cannot be verified.',
                'status' => $integration->status->value,
                'detail' => [],
            ];
        }

        $result = $driver->testConnection($integration);
        $ok = (bool) ($result['ok'] ?? false);

        $integration->forceFill([
            // A verified connection that is switched off is still switched off:
            // `Connected` means "on and proven", and `last_ok_at` records that the
            // credentials work either way.
            'status' => $ok
                ? ($integration->is_enabled ? IntegrationStatus::Connected : IntegrationStatus::Disabled)
                : ($this->hasRequiredCredentials($integration) ? IntegrationStatus::Error : IntegrationStatus::NotConfigured),
            'health_status' => $ok ? 'ok' : 'down',
            'last_ok_at' => $ok ? Carbon::now() : $integration->last_ok_at,
            'last_error_at' => $ok ? $integration->last_error_at : Carbon::now(),
            'last_error' => $ok ? null : ($result['error'] ?? 'The connection test failed.'),
        ])->save();

        $this->audit->log($ok ? 'marketing.integration_connected' : 'marketing.integration_test_failed', $integration, [
            'provider' => $provider,
            'ok' => $ok,
        ], $actor);

        return [
            'ok' => $ok,
            'error' => $result['error'] ?? null,
            'status' => $integration->status->value,
            'detail' => (array) ($result['detail'] ?? []),
        ];
    }

    public function disconnect(string $provider, ?User $actor = null): MarketingIntegration
    {
        $integration = $this->ensure($provider);

        $integration->forceFill([
            'credentials' => [],
            'status' => IntegrationStatus::NotConfigured,
            'health_status' => 'unknown',
            'is_enabled' => false,
            'last_error' => null,
            'last_error_at' => null,
        ])->save();

        $this->audit->log('marketing.integration_disconnected', $integration, [
            'provider' => $provider,
        ], $actor);

        return $integration;
    }

    /**
     * Write a sync attempt. Every attempt is recorded, so "last successful sync" is
     * a fact rather than a configuration claim.
     *
     * @param  array{ok?: bool, items?: int, error?: ?string, meta?: array<string, mixed>}  $result
     */
    public function recordSync(string $provider, string $entity, array $result = [], ?Carbon $startedAt = null): ?MarketingSyncLog
    {
        $integration = $this->forProvider($provider);

        if ($integration === null) {
            return null;
        }

        $ok = (bool) ($result['ok'] ?? false);
        $startedAt ??= Carbon::now();
        $finishedAt = Carbon::now();

        $log = MarketingSyncLog::create([
            'integration_id' => $integration->getKey(),
            'direction' => $result['direction'] ?? 'pull',
            'entity' => $entity,
            'status' => $ok ? 'ok' : 'failed',
            'items_count' => (int) ($result['items'] ?? 0),
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
            'duration_ms' => (int) $startedAt->diffInMilliseconds($finishedAt),
            'error' => $result['error'] ?? null,
            'meta' => $result['meta'] ?? null,
        ]);

        $integration->forceFill([
            'last_synced_at' => $finishedAt,
            'last_ok_at' => $ok ? $finishedAt : $integration->last_ok_at,
            'last_error_at' => $ok ? $integration->last_error_at : $finishedAt,
            'last_error' => $ok ? null : ($result['error'] ?? 'The sync failed.'),
            'health_status' => $ok ? 'ok' : 'down',
            'status' => $ok ? IntegrationStatus::Connected : $integration->status,
        ])->save();

        return $log;
    }

    public function connected(string $provider): bool
    {
        return (bool) $this->forProvider($provider)?->isOperational();
    }

    /**
     * Replace one snapshot in an integration's settings.
     *
     * The `at` stamp is written here rather than left to the caller, so every screen
     * that reads a snapshot can say when it was actually fetched.
     *
     * @param  array<string, mixed>  $data
     */
    public function storeSnapshot(string $provider, string $key, array $data): void
    {
        $integration = $this->forProvider($provider);

        if ($integration === null) {
            return;
        }

        $settings = $integration->settings ?? [];
        $settings[$key] = array_merge(['at' => Carbon::now()->toIso8601String()], $data);

        $integration->forceFill(['settings' => $settings])->save();
    }

    /** @return array<string, mixed>|null */
    public function snapshot(string $provider, string $key): ?array
    {
        $snapshot = $this->forProvider($provider)?->settings[$key] ?? null;

        return is_array($snapshot) ? $snapshot : null;
    }

    /**
     * Send a synthetic event through a provider and report what happened.
     *
     * Invoked directly by an operator (permission-gated and audited) rather than
     * through the queue, so the real HTTP result is shown immediately. The event
     * carries no personal data at all — no visitor, no lead — which is why it does
     * not need a consent basis of its own.
     *
     * @return array<string, mixed>
     */
    public function sendTestEvent(string $provider, ?User $actor = null): array
    {
        $label = MarketingIntegrationRegistry::label($provider);
        $integration = $this->forProvider($provider);

        if ($integration === null || ! $integration->isOperational()) {
            return [
                'ok' => false,
                'error' => $label.' must be switched on and verified before a test event can be sent.',
            ];
        }

        $driver = $this->providers->driver($provider);

        if (! $driver instanceof DispatchesMarketingEvents) {
            return ['ok' => false, 'error' => 'The '.$label.' driver cannot receive events.'];
        }

        $event = MarketingEvent::create([
            'event_id' => (string) Str::uuid(),
            'name' => EventName::Lead->value,
            'category' => ConsentCategory::Advertising->value,
            'source' => 'server',
            'occurred_at' => Carbon::now(),
            'properties' => ['test' => true, 'initiated_by' => $actor?->getKey()],
        ]);

        $result = $driver->dispatchEvent($integration, $event);
        $ok = (bool) ($result['ok'] ?? false);

        MarketingEventDelivery::create([
            'marketing_event_id' => $event->getKey(),
            'provider' => $provider,
            'external_event_id' => $event->event_id,
            'status' => $ok ? 'sent' : (($result['skipped'] ?? false) ? 'skipped' : 'failed'),
            'attempts' => 1,
            'http_status' => $result['http_status'] ?? null,
            'response' => $result['response'] ?? null,
            'error' => $result['error'] ?? ($result['reason'] ?? null),
            'sent_at' => $ok ? Carbon::now() : null,
        ]);

        $this->audit->log('marketing.test_event_sent', $integration, [
            'provider' => $provider,
            'ok' => $ok,
            'http_status' => $result['http_status'] ?? null,
        ], $actor);

        return $result + ['ok' => $ok];
    }

    /**
     * Public tracking values for the browser.
     *
     * Only an integration that is switched on **and verified** contributes here, so
     * a half-configured provider never renders a tag. Everything returned is a
     * public identifier; no secret is ever included.
     *
     * @return array<string, mixed>
     */
    public function clientConfig(): array
    {
        $metaPixel = $this->forProvider('meta_pixel');
        $analytics = $this->forProvider('google_analytics');
        $tagManager = $this->forProvider('google_tag_manager');
        $ads = $this->forProvider('google_ads');

        $publicId = function (?MarketingIntegration $integration, string $key): ?string {
            if ($integration === null || ! $integration->isOperational()) {
                return null;
            }

            $value = trim((string) ($integration->credentials[$key] ?? ''));

            return $value === '' ? null : $value;
        };

        $adsConversionId = $publicId($ads, 'conversion_id');

        return [
            'meta_pixel' => $publicId($metaPixel, 'pixel_id'),
            'ga4' => $publicId($analytics, 'measurement_id'),
            'gtm' => $publicId($tagManager, 'container_id'),
            'google_ads' => $adsConversionId === null
                ? null
                : [
                    'conversion_id' => $adsConversionId,
                    'conversion_label' => trim((string) ($ads?->credentials['conversion_label'] ?? '')),
                ],
        ];
    }

    public function hasRequiredCredentials(MarketingIntegration $integration): bool
    {
        $credentials = is_array($integration->credentials) ? $integration->credentials : [];

        foreach (MarketingIntegrationRegistry::requiredCredentialKeys($integration->provider) as $key) {
            if (! isset($credentials[$key]) || trim((string) $credentials[$key]) === '') {
                return false;
            }
        }

        return true;
    }

    protected function hasCredential(MarketingIntegration $integration, string $key): bool
    {
        $credentials = is_array($integration->credentials) ? $integration->credentials : [];

        return isset($credentials[$key]) && trim((string) $credentials[$key]) !== '';
    }

    protected function resolveStatus(MarketingIntegration $integration): IntegrationStatus
    {
        if (! $this->hasRequiredCredentials($integration)) {
            return IntegrationStatus::NotConfigured;
        }

        return $integration->is_enabled ? IntegrationStatus::Configured : IntegrationStatus::Disabled;
    }

    protected function defaultEnvironment(): string
    {
        return (string) config('platform.marketing.environment', 'production');
    }
}
