<?php

namespace App\Domain\Operations;

use App\Domain\Operations\Models\CommandRun;
use App\Models\User;
use Symfony\Component\Process\Process;

/**
 * Runs whitelisted maintenance commands, and — for super admins when the
 * feature flag is on — an accept-listed advanced command. Output is captured,
 * redacted and recorded for the audit trail.
 */
class CommandRunner
{
    /** @return array<string, array{label: string, command: string, danger: bool}> */
    public function curated(): array
    {
        return [
            'migrate' => ['label' => 'Run migrations', 'command' => 'php artisan migrate --force', 'danger' => true],
            'migrate_status' => ['label' => 'Migration status', 'command' => 'php artisan migrate:status', 'danger' => false],
            'optimize_clear' => ['label' => 'Clear caches', 'command' => 'php artisan optimize:clear', 'danger' => false],
            'config_cache' => ['label' => 'Cache config', 'command' => 'php artisan config:cache', 'danger' => false],
            'route_cache' => ['label' => 'Cache routes', 'command' => 'php artisan route:cache', 'danger' => false],
            'view_cache' => ['label' => 'Cache views', 'command' => 'php artisan view:cache', 'danger' => false],
            'queue_restart' => ['label' => 'Restart queue workers', 'command' => 'php artisan queue:restart', 'danger' => false],
            'queue_retry' => ['label' => 'Retry all failed jobs', 'command' => 'php artisan queue:retry all', 'danger' => false],
            'storage_link' => ['label' => 'Link storage', 'command' => 'php artisan storage:link', 'danger' => false],
            'backup' => ['label' => 'Run database backup', 'command' => 'php artisan db:backup', 'danger' => false],
            'verify_backup' => ['label' => 'Verify last backup', 'command' => 'php artisan db:verify-backup', 'danger' => false],
            'prune_backups' => ['label' => 'Prune expired backups', 'command' => 'php artisan backups:prune', 'danger' => false],
            'platform_check' => ['label' => 'Platform readiness check', 'command' => 'php artisan platform:check', 'danger' => false],
            'npm_build' => ['label' => 'Build frontend (npm run build)', 'command' => 'npm run build', 'danger' => true],
        ];
    }

    /** Command prefixes permitted for the advanced terminal. @return list<string> */
    public function allowedPrefixes(): array
    {
        return ['php artisan ', 'composer ', 'npm run ', 'php ', 'node ', 'ls', 'cat '];
    }

    /** Patterns that are always rejected. @return list<string> */
    public function blockedPatterns(): array
    {
        return ['rm -rf', 'rm ', 'migrate:fresh', 'db:wipe', 'drop ', 'truncate', 'sudo', '>', '>>', '&&', '||', ';', '|', '`', '$(', 'chmod', 'chown', 'curl ', 'wget '];
    }

    public function advancedAllowed(string $command): bool
    {
        $command = trim($command);

        foreach ($this->blockedPatterns() as $pattern) {
            if (stripos($command, $pattern) !== false) {
                return false;
            }
        }

        foreach ($this->allowedPrefixes() as $prefix) {
            if (str_starts_with($command, $prefix) || $command === rtrim($prefix)) {
                return true;
            }
        }

        return false;
    }

    public function run(string $command, string $type, ?User $actor = null): CommandRun
    {
        $start = microtime(true);
        $exitCode = 1;
        $output = '';

        try {
            $process = Process::fromShellCommandline($command, base_path());
            $process->setTimeout(120);
            $process->setIdleTimeout(120);
            $process->run();
            $exitCode = $process->getExitCode() ?? 1;
            $output = $process->getOutput()."\n".$process->getErrorOutput();
        } catch (\Throwable $e) {
            $output = $e->getMessage();
            $exitCode = 1;
        }

        return CommandRun::create([
            'command' => $command,
            'type' => $type,
            'exit_code' => $exitCode,
            'output' => mb_substr($this->redact($output), 0, 20000),
            'duration_ms' => (int) ((microtime(true) - $start) * 1000),
            'status' => $exitCode === 0 ? 'completed' : 'failed',
            'user_id' => $actor?->getKey(),
        ]);
    }

    public function redact(string $output): string
    {
        $output = preg_replace('/([A-Za-z0-9_]*(?:password|secret|token|key|credential)[A-Za-z0-9_]*)\s*[=:]\s*\S+/i', '$1=[redacted]', $output) ?? $output;

        return $output;
    }
}
