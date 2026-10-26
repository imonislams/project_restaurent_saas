#!/usr/bin/env php
<?php

/**
 * Writes a RELEASE-MANIFEST.json into a packaged release staging directory.
 *
 * Usage: php scripts/release-manifest.php <version> <staging-dir>
 *
 * The manifest identifies the exact source revision the package was built from
 * so an installation can be verified against a Git commit and version tag.
 */

$version = $argv[1] ?? '';
$dir = $argv[2] ?? '';

if ($version === '' || $dir === '' || ! is_dir($dir)) {
    fwrite(STDERR, "usage: php scripts/release-manifest.php <version> <staging-dir>\n");
    exit(1);
}

$root = dirname(__DIR__);

$commit = getenv('CI_COMMIT_SHORT_SHA') ?: '';
if ($commit === '') {
    $commit = trim((string) @shell_exec('git -C '.escapeshellarg($root).' rev-parse --short HEAD'));
}

$laravel = 'unknown';
$lock = $root.'/composer.lock';
if (is_file($lock)) {
    $data = json_decode((string) file_get_contents($lock), true);

    foreach ($data['packages'] ?? [] as $package) {
        if (($package['name'] ?? '') === 'laravel/framework') {
            $laravel = ltrim((string) ($package['version'] ?? 'unknown'), 'v');
            break;
        }
    }
}

$fileCount = 0;
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
);

foreach ($iterator as $file) {
    if ($file->isFile()) {
        $fileCount++;
    }
}

$manifest = [
    'name' => 'application',
    'version' => $version,
    'commit' => $commit !== '' ? $commit : null,
    'built_at' => gmdate('Y-m-d\TH:i:s\Z'),
    'php' => PHP_VERSION,
    'laravel' => $laravel,
    // Count includes this manifest, which is written below.
    'file_count' => $fileCount + 1,
];

file_put_contents(
    $dir.'/RELEASE-MANIFEST.json',
    json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n",
);

echo json_encode($manifest, JSON_UNESCAPED_SLASHES)."\n";
