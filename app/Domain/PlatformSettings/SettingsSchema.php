<?php

namespace App\Domain\PlatformSettings;

use Illuminate\Validation\Rule;

/**
 * Declarative definition of the platform configuration screens. Each group has
 * fields; each field maps a form input (`name`) to a stored setting key.
 *
 * No secrets live here — credentials stay in the gateway/email configuration.
 */
class SettingsSchema
{
    /** @return array<string, array{label: string, description: string, fields: list<array<string, mixed>>}> */
    public static function groups(): array
    {
        $currencies = collect(config('platform.currencies'))->map(fn ($label, $code) => ['value' => $code, 'label' => $code.' — '.$label])->values()->all();
        $locales = collect(config('app.locales', ['en' => 'English']))->map(fn ($label, $code) => ['value' => $code, 'label' => $label])->values()->all();

        return [
            'general' => [
                'label' => 'General',
                'description' => 'Platform identity, support contacts and regional defaults.',
                'fields' => [
                    self::f('platform_name', 'general.platform_name', 'Platform name', 'text', config('app.name')),
                    self::f('support_email', 'general.support_email', 'Support email', 'email'),
                    self::f('support_phone', 'general.support_phone', 'Support phone', 'text'),
                    self::f('default_locale', 'general.default_locale', 'Default locale', 'select', 'en', null, $locales),
                    self::f('default_timezone', 'general.default_timezone', 'Default timezone', 'text', config('platform.reporting_timezone')),
                    self::f('default_currency', 'general.default_currency', 'Default currency', 'select', 'USD', null, $currencies),
                    self::f('date_format', 'general.date_format', 'Date format', 'text', 'Y-m-d'),
                    self::f('number_format', 'general.number_format', 'Number format', 'text', '1,234.56'),
                ],
            ],
            'branding' => [
                'label' => 'Branding',
                'description' => 'Visual identity used across the control center and documents.',
                'fields' => [
                    self::f('brand_color', 'branding.brand_color', 'Brand colour', 'color', '#4f46e5'),
                    self::f('tagline', 'branding.tagline', 'Tagline', 'text'),
                    self::f('logo_url', 'branding.logo_url', 'Logo', 'image', null, 'PNG, JPG or WebP, up to 2 MB.'),
                    self::f('support_url', 'branding.support_url', 'Support URL', 'text'),
                ],
            ],
            'social' => [
                'label' => 'Social Media',
                'description' => 'Social profiles shown in the public website footer. Leave a field empty to hide it.',
                'fields' => [
                    self::f('facebook', 'social.facebook', 'Facebook', 'url', null, 'https://facebook.com/yourpage'),
                    self::f('instagram', 'social.instagram', 'Instagram', 'url', null, 'https://instagram.com/yourhandle'),
                    self::f('x', 'social.x', 'X (Twitter)', 'url', null, 'https://x.com/yourhandle'),
                    self::f('linkedin', 'social.linkedin', 'LinkedIn', 'url', null, 'https://linkedin.com/company/yourcompany'),
                    self::f('youtube', 'social.youtube', 'YouTube', 'url', null, 'https://youtube.com/@yourchannel'),
                    self::f('tiktok', 'social.tiktok', 'TikTok', 'url', null, 'https://tiktok.com/@yourhandle'),
                    self::f('whatsapp', 'social.whatsapp', 'WhatsApp support number', 'phone', null, 'With country code, e.g. +8801XXXXXXXXX. Customers chat with you from the website.'),
                    self::f('whatsapp_message', 'social.whatsapp_message', 'WhatsApp greeting message', 'text', 'Hello, I need help with Touch Dine.', 'Pre-filled in the customer’s chat.'),
                    self::f('whatsapp_widget', 'social.whatsapp_widget', 'Show floating WhatsApp button on the website', 'boolean', true),
                ],
            ],
            'localization' => [
                'label' => 'Localization',
                'description' => 'Languages and regional formatting defaults.',
                'fields' => [
                    self::f('default_locale', 'localization.default_locale', 'Default locale', 'select', 'en', null, $locales),
                    self::f('supported_locales', 'localization.supported_locales', 'Supported locales (comma separated)', 'text', 'en,bn'),
                    self::f('reporting_currency', 'localization.reporting_currency', 'Reporting currency', 'select', 'USD', null, $currencies),
                    self::f('enabled_currencies', 'localization.enabled_currencies', 'Enabled currencies (comma separated)', 'text', implode(',', array_keys(config('platform.currencies', []))), 'Plan, gateway and coupon currency options are limited to this list.'),
                    self::f('week_start', 'localization.week_start', 'Week starts on', 'select', 'monday', null, [
                        ['value' => 'monday', 'label' => 'Monday'],
                        ['value' => 'sunday', 'label' => 'Sunday'],
                    ]),
                ],
            ],
            'billing' => [
                'label' => 'Billing',
                'description' => 'Subscription billing defaults. Plan pricing and gateways are configured separately.',
                'fields' => [
                    self::f('default_currency', 'billing.default_currency', 'Default billing currency', 'select', 'USD', null, $currencies),
                    self::f('default_pricing_region', 'billing.default_pricing_region', 'Default pricing region', 'select', 'international', 'Used on the website when a visitor’s country cannot be detected (e.g. local development).', [
                        ['value' => 'bd', 'label' => 'Bangladesh'],
                        ['value' => 'international', 'label' => 'International'],
                    ]),
                    self::f('trial_days', 'billing.trial_days', 'Default trial days', 'number', 14),
                    self::f('grace_days', 'billing.grace_days', 'Grace period days', 'number', config('platform.billing.grace_days', 7)),
                    self::f('dunning_days', 'billing.dunning_days', 'Dunning days before grace', 'number', config('platform.billing.dunning_days', 7)),
                    self::f('invoice_prefix', 'billing.invoice_prefix', 'Invoice number prefix', 'text', 'INV'),
                    self::f('tax_rate', 'billing.tax_rate', 'Tax rate (%)', 'number', 0),
                    self::f('cancellation_policy', 'billing.cancellation_policy', 'Cancellation policy', 'select', 'end_of_period', null, [
                        ['value' => 'immediate', 'label' => 'Immediate'],
                        ['value' => 'end_of_period', 'label' => 'End of period'],
                    ]),
                ],
            ],
            // Payment gateways are configured in one place (Platform Configuration →
            // Payment Gateways), not as a single default here. Several gateways can
            // be enabled at once; credentials live on each gateway configuration.
            'operations' => [
                'label' => 'Operations',
                'description' => 'Backups and housekeeping. Maintenance mode is managed on its own screen.',
                'fields' => [
                    self::f('backup_retention_days', 'operations.backup_retention_days', 'Backup retention (days)', 'number', config('platform.backups.retention_days', 30)),
                    self::f('log_retention_days', 'operations.log_retention_days', 'Application log retention (days)', 'number', 30),
                    self::f('health_cache_seconds', 'operations.health_cache_seconds', 'Health check cache (seconds)', 'number', 60),
                ],
            ],
            'security' => [
                'label' => 'Security',
                'description' => 'Session and access policy for platform administrators.',
                'fields' => [
                    self::f('session_lifetime_minutes', 'security.session_lifetime_minutes', 'Session lifetime (minutes)', 'number', 120),
                    self::f('max_login_attempts', 'security.max_login_attempts', 'Max login attempts', 'number', 5),
                    self::f('mfa_required', 'security.mfa_required', 'Require MFA for administrators', 'boolean', false, 'Recorded now; enforcement is not implemented yet.'),
                    self::f('impersonation_max_minutes', 'security.impersonation_max_minutes', 'Impersonation time limit (minutes)', 'number', 60),
                ],
            ],
            'retention' => [
                'label' => 'Data Retention',
                'description' => 'How long operational records are kept before pruning.',
                'fields' => [
                    self::f('log_retention_days', 'retention.log_retention_days', 'Application logs (days)', 'number', 30),
                    self::f('email_log_retention_days', 'retention.email_log_retention_days', 'Email logs (days)', 'number', 90),
                    self::f('audit_retention_days', 'retention.audit_retention_days', 'Audit records (days)', 'number', 365),
                    self::f('backup_retention_days', 'retention.backup_retention_days', 'Backups (days)', 'number', config('platform.backups.retention_days', 30)),
                ],
            ],
            'features' => [
                'label' => 'Feature Flags',
                'description' => 'Toggle platform capabilities. Flags are enforced on the backend.',
                'fields' => [
                    self::f('impersonation', 'features.impersonation', 'Support impersonation', 'boolean', true),
                    self::f('gateway_checkout', 'features.gateway_checkout', 'Gateway invoice checkout', 'boolean', true),
                    self::f('command_terminal', 'features.command_terminal', 'Advanced command terminal (super admin only)', 'boolean', false),
                ],
            ],
            'receipts' => [
                'label' => 'Receipt Branding',
                'description' => 'Your SaaS provider branding (logo, website and support details) shown in the footer of every restaurant receipt.',
                'fields' => [
                    self::f('show_logo', 'receipts.show_logo', 'Show the provider logo on receipts', 'boolean', true),
                    self::f('show_company_details', 'receipts.show_company_details', 'Show provider name and support contacts', 'boolean', true),
                    self::f('website', 'receipts.website', 'Website shown on receipts', 'text', null, 'Falls back to the Branding support URL when empty.'),
                ],
            ],
        ];
    }

    /** @return array{label: string, description: string, fields: list<array<string, mixed>>}|null */
    public static function group(string $group): ?array
    {
        return self::groups()[$group] ?? null;
    }

    /** @return list<string> */
    public static function groupNames(): array
    {
        return array_keys(self::groups());
    }

    /** @return array<string, mixed> */
    public static function field(string $name): array
    {
        foreach (self::groups() as $schema) {
            foreach ($schema['fields'] as $field) {
                if ($field['name'] === $name) {
                    return $field;
                }
            }
        }

        return [];
    }

    /** @return list<string|object> */
    public static function rulesFor(array $field): array
    {
        return match ($field['type']) {
            'boolean' => ['required', 'boolean'],
            'number' => ['nullable', 'numeric', 'min:0'],
            'email' => ['nullable', 'email', 'max:255'],
            'url' => ['nullable', 'url:http,https', 'max:255'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'phone' => ['nullable', 'regex:/^\+?[0-9][0-9 \-()]{6,19}$/'],
            'select' => ['nullable', 'string', Rule::in(array_column($field['options'] ?? [], 'value'))],
            default => ['nullable', 'string', 'max:1000'],
        };
    }

    /**
     * @param  list<array{value: string, label: string}>|null  $options
     * @return array<string, mixed>
     */
    private static function f(string $name, string $setting, string $label, string $type = 'text', mixed $default = null, ?string $hint = null, ?array $options = null): array
    {
        return array_filter([
            'name' => $name,
            'setting' => $setting,
            'label' => $label,
            'type' => $type,
            'default' => $default,
            'hint' => $hint,
            'options' => $options,
        ], fn ($value) => $value !== null);
    }
}
