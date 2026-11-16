<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Platform reporting
    |--------------------------------------------------------------------------
    |
    | All platform-level financial reporting (MRR, ARR, collected revenue) is
    | expressed in a single reporting currency. Multi-currency plan pricing and
    | FX conversion arrive with the billing/payments phases; until then every
    | plan shares one currency and figures are summed directly.
    |
    */

    'reporting_currency' => env('PLATFORM_REPORTING_CURRENCY', 'USD'),

    'reporting_timezone' => env('PLATFORM_REPORTING_TIMEZONE', 'UTC'),

    // A backup older than this is flagged as stale on the health strip.
    'backup_freshness_hours' => (int) env('PLATFORM_BACKUP_FRESHNESS_HOURS', 36),

    /*
    |--------------------------------------------------------------------------
    | Billing / dunning
    |--------------------------------------------------------------------------
    |
    | Subscription lifecycle windows. A past-due subscription moves into a grace
    | period (access retained) after `dunning_days`, then suspends once the grace
    | period ends.
    |
    */

    'billing' => [
        'dunning_days' => (int) env('PLATFORM_DUNNING_DAYS', 7),
        'grace_days' => (int) env('PLATFORM_GRACE_DAYS', 7),
    ],

    /*
    |--------------------------------------------------------------------------
    | Regional pricing
    |--------------------------------------------------------------------------
    |
    | The public site shows region-specific plan pricing. A visitor's region is
    | resolved from an explicit choice (session), then a trusted CDN country
    | header, then `default_region`. This affects display only — billing and
    | gateway eligibility use the tenant's billing profile.
    |
    */

    'pricing' => [
        // null = derive from the platform default currency (BDT ⇒ Bangladesh);
        // set PLATFORM_DEFAULT_PRICING_REGION=bd|international to force it.
        'default_region' => env('PLATFORM_DEFAULT_PRICING_REGION'),

        // Trust the country header only when the app is behind a CDN/proxy that
        // sets it (Cloudflare, Vercel). Leave false when directly exposed.
        'trust_country_header' => (bool) env('PLATFORM_TRUST_COUNTRY_HEADER', true),
        'country_headers' => ['CF-IPCountry', 'X-Vercel-IP-Country', 'X-Country-Code'],

        // When the server cannot see the visitor's country (e.g. local dev, or a
        // host without a geo header), the browser detects its own country and
        // stores it here. Display only — validated as a 2-letter code.
        'country_cookie' => 'pricing_country',
        'geo_lookup_url' => env('PLATFORM_GEO_LOOKUP_URL', 'https://ipwho.is/'),

        'regions' => [
            'bd' => [
                'label' => 'Bangladesh',
                'currency' => 'BDT',
                'country_codes' => ['BD'],
            ],
            'international' => [
                'label' => 'International',
                'currency' => 'USD',
                'country_codes' => [],
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Supported currencies
    |--------------------------------------------------------------------------
    |
    | The currency set offered when configuring plan prices and coupons.
    |
    */

    'currencies' => [
        'USD' => 'US Dollar',
        'BDT' => 'Bangladeshi Taka',
        'EUR' => 'Euro',
        'GBP' => 'Pound Sterling',
        'INR' => 'Indian Rupee',
        'AED' => 'UAE Dirham',
        'SGD' => 'Singapore Dollar',
    ],

    /*
    |--------------------------------------------------------------------------
    | Backups
    |--------------------------------------------------------------------------
    |
    | Logical snapshots are written to the private 'local' disk. Encrypting the
    | artifact protects snapshots that contain tenant data.
    |
    */

    'backups' => [
        // Encrypted by default: a backup contains every tenant's business data
        // plus credential material (password hashes, manager PINs), so an
        // unencrypted artefact is a full-disclosure risk the moment it leaves the
        // host. Opt out only for a throwaway local database.
        'encrypt' => (bool) env('PLATFORM_BACKUP_ENCRYPT', true),
        'retention_days' => (int) env('PLATFORM_BACKUP_RETENTION_DAYS', 30),
    ],

    /*
    | Database host capacity expectations (QA-E-03).
    |
    | A 16 MB InnoDB buffer pool — the XAMPP default — was measured as the real
    | POS throughput ceiling: raising it to 256 MB cut latency 65% and nearly
    | tripled throughput with no change in query count. `php artisan platform:check`
    | reads the live value and fails below this minimum, so a host left at the
    | default is caught at deploy rather than discovered in a load test.
    */
    'database' => [
        'min_buffer_pool_mb' => (int) env('PLATFORM_DB_MIN_BUFFER_POOL_MB', 128),
    ],

    /*
    | Platform administrator created by PlatformAdminSeeder. Read through config
    | (not env() in the seeder) so it still works when the config is cached.
    */
    'admin' => [
        'name' => env('PLATFORM_ADMIN_NAME', 'Platform Admin'),
        'email' => env('PLATFORM_ADMIN_EMAIL', 'platform@example.com'),
        'password' => env('PLATFORM_ADMIN_PASSWORD'),
    ],

];
