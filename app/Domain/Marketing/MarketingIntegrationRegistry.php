<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\ConsentCategory;

/**
 * The single source of truth for provider metadata: label, capabilities, credential
 * fields (with secret flags), the consent category that governs it, and whether it
 * receives events or supplies synced data.
 *
 * The UI renders from this registry, so adding a provider is one driver class plus
 * one entry here — mirroring GatewayProviderRegistry.
 */
final class MarketingIntegrationRegistry
{
    /**
     * @var array<string, array{
     *     label: string,
     *     description: string,
     *     group: string,
     *     consent: ?string,
     *     dispatches_events: bool,
     *     syncs_data: bool,
     *     docs: string,
     *     credentials: array<string, array{label: string, type: string, secret: bool, required: bool, help?: string}>
     * }>
     */
    public const SCHEMA = [
        'meta_pixel' => [
            'label' => 'Meta Pixel',
            'description' => 'Browser-side Meta tracking for page views, leads and conversions.',
            'group' => 'tracking',
            'consent' => ConsentCategory::Advertising->value,
            'dispatches_events' => false,
            'syncs_data' => false,
            'docs' => 'https://developers.facebook.com/docs/meta-pixel',
            'credentials' => [
                'pixel_id' => ['label' => 'Pixel ID', 'type' => 'text', 'secret' => false, 'required' => true, 'help' => 'Public identifier — it appears in the page HTML on any site that uses it.'],
            ],
        ],
        'meta_conversions' => [
            'label' => 'Meta Conversions API',
            'description' => 'Server-side event delivery with deduplication and test events.',
            'group' => 'tracking',
            'consent' => ConsentCategory::Advertising->value,
            'dispatches_events' => true,
            'syncs_data' => false,
            'docs' => 'https://developers.facebook.com/docs/marketing-api/conversions-api',
            'credentials' => [
                'pixel_id' => ['label' => 'Pixel ID', 'type' => 'text', 'secret' => false, 'required' => true],
                'access_token' => ['label' => 'Access token', 'type' => 'secret', 'secret' => true, 'required' => true],
                'business_id' => ['label' => 'Business ID', 'type' => 'text', 'secret' => false, 'required' => false],
                'ad_account_id' => ['label' => 'Ad account ID', 'type' => 'text', 'secret' => false, 'required' => false],
                'test_event_code' => ['label' => 'Test event code', 'type' => 'text', 'secret' => false, 'required' => false, 'help' => 'Events sent with a test code appear in Events Manager → Test Events and are excluded from reporting.'],
            ],
        ],
        'google_analytics' => [
            'label' => 'Google Analytics 4',
            'description' => 'GA4 reporting via the Data API, with property selection and token refresh.',
            'group' => 'analytics',
            'consent' => ConsentCategory::Analytics->value,
            'dispatches_events' => false,
            'syncs_data' => true,
            'docs' => 'https://developers.google.com/analytics/devguides/reporting/data/v1',
            'credentials' => [
                'property_id' => ['label' => 'GA4 property ID', 'type' => 'text', 'secret' => false, 'required' => true, 'help' => 'Numeric property id, or the properties/123456789 form.'],
                'measurement_id' => ['label' => 'Measurement ID', 'type' => 'text', 'secret' => false, 'required' => false, 'help' => 'Public G-XXXXXXX id used by the browser tag. Required for GA4 to collect visits; the property id above is only for reporting.'],
                'auth_mode' => ['label' => 'Auth mode', 'type' => 'text', 'secret' => false, 'required' => false, 'help' => 'oauth or service_account. Either a Google OAuth connection or a service-account key is required.'],
                'client_id' => ['label' => 'OAuth client ID', 'type' => 'text', 'secret' => false, 'required' => false],
                'client_secret' => ['label' => 'OAuth client secret', 'type' => 'secret', 'secret' => true, 'required' => false],
                'refresh_token' => ['label' => 'OAuth refresh token', 'type' => 'secret', 'secret' => true, 'required' => false],
                'service_account_json' => ['label' => 'Service account JSON', 'type' => 'secret', 'secret' => true, 'required' => false],
            ],
        ],
        'google_tag_manager' => [
            'label' => 'Google Tag Manager',
            'description' => 'Container configuration with consent mode and duplicate-container prevention.',
            'group' => 'analytics',
            'consent' => ConsentCategory::Analytics->value,
            'dispatches_events' => false,
            'syncs_data' => false,
            'docs' => 'https://developers.google.com/tag-platform/tag-manager',
            'credentials' => [
                'container_id' => ['label' => 'Container ID', 'type' => 'text', 'secret' => false, 'required' => true, 'help' => 'Public GTM-XXXXXX identifier. Only one container may be configured.'],
            ],
        ],
        'search_console' => [
            'label' => 'Google Search Console',
            'description' => 'Search performance: impressions, clicks, CTR, position, queries and pages.',
            'group' => 'analytics',
            'consent' => null,
            'dispatches_events' => false,
            'syncs_data' => true,
            'docs' => 'https://developers.google.com/webmaster-tools/v1/searchanalytics',
            'credentials' => [
                'site_url' => ['label' => 'Property', 'type' => 'text', 'secret' => false, 'required' => true, 'help' => 'The exact verified property string, e.g. sc-domain:example.com or https://example.com/.'],
                'client_id' => ['label' => 'OAuth client ID', 'type' => 'text', 'secret' => false, 'required' => false],
                'client_secret' => ['label' => 'OAuth client secret', 'type' => 'secret', 'secret' => true, 'required' => false],
                'refresh_token' => ['label' => 'OAuth refresh token', 'type' => 'secret', 'secret' => true, 'required' => false],
                'service_account_json' => ['label' => 'Service account JSON', 'type' => 'secret', 'secret' => true, 'required' => false],
            ],
        ],
        'google_ads' => [
            'label' => 'Google Ads',
            'description' => 'Conversion tracking; spend sync requires an approved developer token.',
            'group' => 'tracking',
            'consent' => ConsentCategory::Advertising->value,
            'dispatches_events' => false,
            'syncs_data' => true,
            'docs' => 'https://developers.google.com/google-ads/api/docs/start',
            'credentials' => [
                'conversion_id' => ['label' => 'Conversion ID', 'type' => 'text', 'secret' => false, 'required' => false, 'help' => 'Required for conversion tracking.'],
                'conversion_label' => ['label' => 'Conversion label', 'type' => 'text', 'secret' => false, 'required' => false],
                'developer_token' => ['label' => 'Developer token', 'type' => 'secret', 'secret' => true, 'required' => false, 'help' => 'Required for spend sync. Google must approve it — until then spend stays manual.'],
                'customer_id' => ['label' => 'Customer ID', 'type' => 'text', 'secret' => false, 'required' => false],
                'login_customer_id' => ['label' => 'Manager (MCC) customer ID', 'type' => 'text', 'secret' => false, 'required' => false],
            ],
        ],
        'platform_mail' => [
            'label' => 'Email marketing',
            'description' => 'Campaign sending through the platform mail provider, with open, click and unsubscribe tracking.',
            'group' => 'email',
            'consent' => null,
            'dispatches_events' => false,
            'syncs_data' => false,
            'docs' => '/platform/email/settings',
            'credentials' => [],
        ],
    ];

    /** @return list<string> */
    public static function keys(): array
    {
        return array_keys(self::SCHEMA);
    }

    /** @return array<string, array<string, mixed>> */
    public static function all(): array
    {
        return self::SCHEMA;
    }

    /** @return array<string, mixed>|null */
    public static function get(string $provider): ?array
    {
        return self::SCHEMA[$provider] ?? null;
    }

    public static function label(string $provider): string
    {
        return (string) (self::SCHEMA[$provider]['label'] ?? $provider);
    }

    /** @return list<string> */
    public static function requiredCredentialKeys(string $provider): array
    {
        $fields = self::SCHEMA[$provider]['credentials'] ?? [];

        return array_keys(array_filter(
            $fields,
            fn (array $field) => ($field['required'] ?? false) === true,
        ));
    }

    /** @return array<string, array<string, mixed>> */
    public static function credentialFields(string $provider): array
    {
        return self::SCHEMA[$provider]['credentials'] ?? [];
    }

    /** @return list<string> */
    public static function secretKeys(string $provider): array
    {
        $fields = self::SCHEMA[$provider]['credentials'] ?? [];

        return array_keys(array_filter($fields, fn (array $field) => ($field['secret'] ?? false) === true));
    }

    public static function dispatchesEvents(string $provider): bool
    {
        return (bool) (self::SCHEMA[$provider]['dispatches_events'] ?? false);
    }

    public static function syncsData(string $provider): bool
    {
        return (bool) (self::SCHEMA[$provider]['syncs_data'] ?? false);
    }

    /** The consent category that must be granted before this provider is used. */
    public static function consentCategory(string $provider): ?ConsentCategory
    {
        $value = self::SCHEMA[$provider]['consent'] ?? null;

        return $value === null ? null : ConsentCategory::from($value);
    }

    /** @return list<string> Providers that may not be used without the given category. */
    public static function requiringConsent(ConsentCategory $category): array
    {
        return array_values(array_filter(
            self::keys(),
            fn (string $key) => self::consentCategory($key) === $category,
        ));
    }

    /** @return array<string, list<string>> Providers grouped for the integrations screen. */
    public static function grouped(): array
    {
        $groups = [];

        foreach (self::SCHEMA as $key => $schema) {
            $groups[$schema['group']][] = $key;
        }

        return $groups;
    }
}
