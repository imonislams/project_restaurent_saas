<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Bumps the root VERSION file. This only rewrites the version — the changelog
 * entry, merge and tag are deliberate release steps (see docs/RELEASE.md).
 */
class VersionBumpCommand extends Command
{
    protected $signature = 'version:bump {part=patch : patch, minor or major}';

    protected $description = 'Bump the application version in the root VERSION file';

    public function handle(): int
    {
        $part = strtolower((string) $this->argument('part'));

        if (! in_array($part, ['patch', 'minor', 'major'], true)) {
            $this->error('Part must be one of: patch, minor, major.');

            return self::FAILURE;
        }

        $path = base_path('VERSION');
        $current = is_file($path) ? trim((string) file_get_contents($path)) : '';

        if (! preg_match('/^(\d+)\.(\d+)\.(\d+)/', $current, $matches)) {
            $this->error("VERSION must contain a plain MAJOR.MINOR.PATCH value (found: \"{$current}\").");

            return self::FAILURE;
        }

        $major = (int) $matches[1];
        $minor = (int) $matches[2];
        $patch = (int) $matches[3];

        if ($part === 'major') {
            $major++;
            $minor = 0;
            $patch = 0;
        } elseif ($part === 'minor') {
            $minor++;
            $patch = 0;
        } else {
            $patch++;
        }

        $next = sprintf('%d.%d.%d', $major, $minor, $patch);

        file_put_contents($path, $next.PHP_EOL);

        $this->info("Version bumped: {$current} → {$next}");
        $this->line('Next: add the CHANGELOG entry, merge to main and tag v'.$next.'.');

        return self::SUCCESS;
    }
}
