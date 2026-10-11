<?php

namespace App\Domain\PlatformSettings;

use App\Domain\PlatformSettings\Models\PlatformSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Platform configuration store. Values may be encrypted at rest (credentials)
 * and are cached briefly.
 */
class PlatformSettings
{
    protected const CACHE_KEY = 'platform_settings';

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return collect($this->rows())->mapWithKeys(fn (array $row) => [$row['key'] => $row['value']])->all();
    }

    /** @return array<string, mixed> */
    public function group(string $group): array
    {
        return collect($this->rows())
            ->where('group', $group)
            ->mapWithKeys(fn (array $row) => [$row['key'] => $row['value']])
            ->all();
    }

    public function set(string $key, mixed $value, string $group = 'general', bool $encrypted = false): void
    {
        $encoded = json_encode($value);

        PlatformSetting::updateOrCreate(
            ['key' => $key],
            [
                'group' => $group,
                'is_encrypted' => $encrypted,
                'value' => $encrypted ? Crypt::encryptString($encoded) : $encoded,
            ],
        );

        $this->forget();
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** The currency platform reporting/analytics is expressed in. */
    public function reportingCurrency(): string
    {
        return strtoupper((string) (
            $this->get('localization.reporting_currency')
            ?? $this->get('general.default_currency')
            ?? config('platform.reporting_currency', 'USD')
        ));
    }

    /** @return list<string> */
    public function enabledCurrencies(): array
    {
        $value = $this->get('localization.enabled_currencies');

        if (is_array($value) && $value !== []) {
            return array_values(array_map('strtoupper', array_filter($value)));
        }

        if (is_string($value) && trim($value) !== '') {
            return array_values(array_filter(array_map(fn ($code) => strtoupper(trim($code)), explode(',', $value))));
        }

        if (is_array($value) && $value === []) {
            return array_keys(config('platform.currencies', []));
        }

        return array_keys(config('platform.currencies', []));
    }

    /** @return list<array{key: string, group: string, value: mixed}> */
    protected function rows(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, function () {
            try {
                return PlatformSetting::query()->get()->map(fn (PlatformSetting $setting) => [
                    'key' => $setting->key,
                    'group' => $setting->group,
                    'value' => $this->decode($setting),
                ])->all();
            } catch (\Throwable) {
                // Table may not exist yet (e.g. first install) — fail closed to defaults.
                return [];
            }
        });
    }

    protected function decode(PlatformSetting $setting): mixed
    {
        $raw = $setting->value;

        if ($raw === null) {
            return null;
        }

        if ($setting->is_encrypted) {
            try {
                $raw = Crypt::decryptString($raw);
            } catch (\Throwable) {
                return null;
            }
        }

        return json_decode($raw, true);
    }
}
