<?php

namespace App\Domain\Installer;

/**
 * Records whether the application has been installed. The lock file is the
 * single source of truth: its presence hides the setup wizard and is written
 * only once an installation completes.
 */
class InstallState
{
    public function __construct(protected ?string $path = null) {}

    public function path(): string
    {
        return $this->path ?? storage_path('app/private/installed.lock');
    }

    public function isInstalled(): bool
    {
        return is_file($this->path());
    }

    /** @return array<string, mixed>|null */
    public function details(): ?array
    {
        if (! $this->isInstalled()) {
            return null;
        }

        $data = json_decode((string) file_get_contents($this->path()), true);

        return is_array($data) ? $data : null;
    }

    /** @param array<string, mixed> $details */
    public function lock(array $details = []): void
    {
        $directory = dirname($this->path());

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $payload = array_merge([
            'installed_at' => now()->toIso8601String(),
            'version' => config('version.version'),
        ], $details);

        file_put_contents(
            $this->path(),
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n",
        );

        @chmod($this->path(), 0600);
    }

    public function unlock(): void
    {
        if ($this->isInstalled()) {
            @unlink($this->path());
        }
    }
}
