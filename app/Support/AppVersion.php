<?php

namespace App\Support;

use Throwable;

/**
 * The deployed application version, as reported by the UI, /health and the CLI.
 *
 * The root VERSION file is the single source of truth (see config/version.php).
 * The commit is build metadata: it is read from APP_COMMIT when a deploy injects
 * it, otherwise detected from git — which only happens outside production.
 */
class AppVersion
{
    protected ?string $commit = null;

    public function version(): string
    {
        return (string) config('version.version', '0.0.0');
    }

    /** Short commit SHA of the deployed code, or an empty string when unknown. */
    public function commit(): string
    {
        if ($this->commit !== null) {
            return $this->commit;
        }

        $configured = trim((string) config('version.commit', ''));

        return $this->commit = $configured !== '' ? $configured : $this->detectCommit();
    }

    /** Human-readable label, e.g. "v0.1.0 · d6a0efb". */
    public function label(): string
    {
        $commit = $this->commit();

        return 'v'.$this->version().($commit !== '' ? ' · '.$commit : '');
    }

    protected function detectCommit(): string
    {
        if (! function_exists('shell_exec')) {
            return '';
        }

        try {
            $output = shell_exec(sprintf('git -C %s rev-parse --short HEAD 2>/dev/null', escapeshellarg(base_path())));

            return trim((string) $output);
        } catch (Throwable) {
            return '';
        }
    }
}
