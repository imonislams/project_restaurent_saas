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
