<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Operations Binaries
    |--------------------------------------------------------------------------
    |
    | Absolute paths to the PHP and npm executables used by the platform's
    | command runner. When left null the runner auto-detects: on CLI it uses the
    | running PHP binary; under a web server (fpm/cgi) it looks for the sibling
    | CLI binary (e.g. MAMP's .../bin/php-fpm → .../bin/php); otherwise it falls
    | back to the bare name on the PATH.
    |
    */

    'php_binary' => env('OPERATIONS_PHP_BINARY'),

    'npm_binary' => env('OPERATIONS_NPM_BINARY'),

    /*
    |--------------------------------------------------------------------------
    | Migration Runner Timeout
    |--------------------------------------------------------------------------
    |
    | Seconds allowed for a Command Center migration run (including the optional
    | pre-run database backup). Keep it below the web server / PHP-FPM request
    | timeout: the run is synchronous and the HTTP request cannot outlive that.
    |
    */

    'migration_timeout' => (int) env('OPERATIONS_MIGRATION_TIMEOUT', 600),

];
