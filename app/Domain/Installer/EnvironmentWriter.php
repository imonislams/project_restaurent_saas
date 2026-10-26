<?php

namespace App\Domain\Installer;

/**
 * Merges values into the application's .env file without disturbing unrelated
 * keys. Values are never returned or logged — only written.
 */
class EnvironmentWriter
{
    public function __construct(protected ?string $path = null) {}

    /** @param array<string, string|int|float|null> $values */
    public function set(array $values): void
    {
        $path = $this->path ?? base_path('.env');
        $contents = $this->read($path);

        $contents = rtrim($contents, "\n");

        foreach ($values as $key => $value) {
            $line = $key.'='.$this->format($value);
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';

            if (preg_match($pattern, $contents)) {
                $contents = (string) preg_replace($pattern, $this->escapeReplacement($line), $contents, 1);
            } else {
                $contents .= "\n".$line;
            }
        }

        file_put_contents($path, $contents."\n");

        @chmod($path, 0600);
    }

    protected function read(string $path): string
    {
        if (is_file($path)) {
            return (string) file_get_contents($path);
        }

        $example = base_path('.env.example');

        if (is_file($example)) {
            return (string) file_get_contents($example);
        }

        return '';
    }

    protected function format(string|int|float|null $value): string
    {
        $value = (string) $value;

        // Quote anything that would otherwise break dotenv parsing.
        if ($value === '' || preg_match('/[\s#"\']/', $value) === 1) {
            return '"'.addcslashes($value, '"\\').'"';
        }

        return $value;
    }

    /** preg_replace treats backslashes and $ in the replacement specially. */
    protected function escapeReplacement(string $value): string
    {
        return str_replace(['\\', '$'], ['\\\\', '\\$'], $value);
    }
}
