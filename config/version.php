<?php

/**
 * Application version.
 *
 * The repository-root VERSION file is the single source of truth. Set
 * APP_VERSION / APP_COMMIT to override it from a deploy pipeline (for example
 * the value of the git tag being released).
 */
$version = '0.0.0';
$path = dirname(__DIR__).'/VERSION';

if (is_file($path)) {
    $contents = trim((string) file_get_contents($path));

    if ($contents !== '') {
        $version = $contents;
    }
}

return [
    'version' => env('APP_VERSION') ?: $version,
    'commit' => env('APP_COMMIT') ?: null,
];
