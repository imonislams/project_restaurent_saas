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

];
