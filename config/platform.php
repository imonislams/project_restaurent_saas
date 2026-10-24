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
        'encrypt' => (bool) env('PLATFORM_BACKUP_ENCRYPT', false),
        'retention_days' => (int) env('PLATFORM_BACKUP_RETENTION_DAYS', 30),
    ],

];
