<?php

namespace App\Domain\Installer;

/**
 * Verifies the server can run the application. Powers the first step of the
 * setup wizard and the `app:install` preflight.
 */
class RequirementsChecker
{
    public const MIN_PHP = '8.2.0';

    /**
     * @return list<array{key: string, label: string, ok: bool, detail: string, required: bool}>
     */
    public function checks(): array
    {
        $checks = [
            $this->check(
                'php_version',
                'PHP '.self::MIN_PHP.' or newer',
                version_compare(PHP_VERSION, self::MIN_PHP, '>='),
                PHP_VERSION,
            ),
        ];

        foreach ($this->requiredExtensions() as $extension) {
            $loaded = extension_loaded($extension);

            $checks[] = $this->check(
                'ext_'.$extension,
                'PHP extension: '.$extension,
                $loaded,
                $loaded ? 'loaded' : 'missing',
            );
        }

        $image = extension_loaded('gd') || extension_loaded('imagick');
        $checks[] = $this->check('ext_image', 'PHP extension: gd or imagick', $image, $image ? 'loaded' : 'missing');

        foreach ($this->writablePaths() as $label => $path) {
            $writable = $this->isWritable($path);

            $checks[] = $this->check('writable_'.$label, $label.' is writable', $writable, $writable ? 'writable' : $path);
        }

        $checks[] = $this->check(
            'symlink',
            'Symlink support (storage:link)',
            function_exists('symlink'),
            function_exists('symlink') ? 'available' : 'disabled by the host',
        );

        $checks[] = $this->check(
            'vendor',
            'Dependencies installed (vendor/)',
            is_dir(base_path('vendor')),
            is_dir(base_path('vendor')) ? 'present' : 'run composer install --no-dev',
        );

        $checks[] = $this->check(
            'assets',
            'Compiled frontend assets (public/build)',
            is_dir(public_path('build')),
            is_dir(public_path('build')) ? 'present' : 'missing public/build',
        );

        return $checks;
    }

    public function ok(): bool
    {
        foreach ($this->checks() as $check) {
            if ($check['required'] && ! $check['ok']) {
                return false;
            }
        }

        return true;
    }

    /** @return list<string> */
    protected function requiredExtensions(): array
    {
        return ['openssl', 'pdo', 'pdo_mysql', 'mbstring', 'ctype', 'fileinfo', 'bcmath', 'tokenizer', 'xml', 'curl', 'zip'];
    }

    /** @return array<string, string> */
    protected function writablePaths(): array
    {
        return [
            'storage' => storage_path(),
            'storage/framework' => storage_path('framework'),
            'storage/logs' => storage_path('logs'),
            'bootstrap/cache' => base_path('bootstrap/cache'),
            '.env' => is_file(base_path('.env')) ? base_path('.env') : base_path(),
        ];
    }

    protected function isWritable(string $path): bool
    {
        return is_writable($path);
    }

    /** @return array{key: string, label: string, ok: bool, detail: string, required: bool} */
    protected function check(string $key, string $label, bool $ok, string $detail, bool $required = true): array
    {
        return compact('key', 'label', 'ok', 'detail', 'required');
    }
}
