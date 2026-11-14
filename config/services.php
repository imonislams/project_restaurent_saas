<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'payments' => [
        // Shared secret used to verify signed provider webhooks (HMAC-SHA256).
        // Deliberately has no default: a shipped fallback would let anyone with
        // access to the source forge a valid signature. StubGateway rejects
        // every webhook while this is unset.
        'stub_secret' => env('PAYMENT_STUB_SECRET'),
    ],

    'sms' => [
        // The active driver is configured in the platform SMS settings; these
        // values are the fallback defaults.
        'driver' => env('SMS_DRIVER', 'log'),
    ],

];
