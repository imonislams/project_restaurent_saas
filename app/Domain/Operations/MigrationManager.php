<?php

namespace App\Domain\Operations;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Operations\Models\CommandRun;
use App\Models\User;
use Illuminate\Contracts\Cache\Lock;
use Illuminate\Database\Migrations\Migrator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Read-only migration state plus selective execution for the Command Center.
 *
 * Only migrations that are pending at the moment of the run may be executed;
 * the selection is re-validated server-side, ordered by filename (Laravel's
 * execution order) and applied in a single `migrate --path=…` invocation so the
 * selected files share one batch.
 */
class MigrationManager
{
    public function __construct(
        protected CommandRunner $commands,
        protected ProcessRunner $processes,
        protected AuditLogger $audit,
    ) {}

    /**
     * @return array{
     *     readable: bool,
     *     error: ?string,
     *     pending: array<int, array{name: string, status: string, batch: ?int}>,
     *     executed: array<int, array{name: string, status: string, batch: ?int}>
     * }
     */
    public function state(): array
    {
        try {
            /** @var Migrator $migrator */
            $migrator = app('migrator');

            if (! $migrator->repositoryExists()) {
                return ['readable' => true, 'error' => null, 'pending' => [], 'executed' => []];
            }

            $files = $migrator->getMigrationFiles([database_path('migrations')]);
            $ran = $migrator->getRepository()->getRan();

            $batches = DB::table(config('database.migrations.table', 'migrations'))
                ->pluck('batch', 'migration')
                ->all();

            $pending = array_values(array_diff(array_keys($files), $ran));

            return [
                'readable' => true,
                'error' => null,
                'pending' => array_map(
                    fn (string $name) => ['name' => $name, 'status' => 'pending', 'batch' => null],
                    $pending,
                ),
                'executed' => array_map(
                    fn (string $name) => ['name' => $name, 'status' => 'executed', 'batch' => $batches[$name] ?? null],
                    $ran,
                ),
            ];
        } catch (Throwable $e) {
            report($e);

            return [
                'readable' => false,
                'error' => 'Migration state could not be read: '.$e->getMessage(),
                'pending' => [],
                'executed' => [],
            ];
        }
    }

    /** @return list<string> */
    public function pendingNames(): array
    {
        return array_values(array_column($this->state()['pending'], 'name'));
    }

    /**
     * Run the selected pending migrations in one batch, after an optional backup.
     *
     * @param  list<string>  $names
     * @return array{
     *     exit_code: int,
     *     output: string,
     *     migrations: list<string>,
     *     backup: string,
     *     out_of_order: bool,
     *     duration_ms: int,
     *     run_id: int
     * }
     *
     * @throws ValidationException when the selection is empty, stale or invalid
     */
    public function run(array $names, ?User $actor = null, bool $backup = true): array
    {
        $pending = $this->pendingNames();
        $requested = array_values(array_unique(array_map(fn ($name) => (string) $name, $names)));

        foreach ($requested as $name) {
            if ($name === '' || str_contains($name, '/') || str_contains($name, '\\') || str_contains($name, '..')) {
                throw ValidationException::withMessages(['migrations' => 'Invalid migration name.']);
            }
        }

        $unknown = array_values(array_diff($requested, $pending));

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'migrations' => 'These migrations are no longer pending: '.implode(', ', $unknown),
            ]);
        }

        $selected = array_values(array_intersect($pending, $requested));

        if ($selected === []) {
            throw ValidationException::withMessages(['migrations' => 'Select at least one pending migration.']);
        }

        // Selected files may skip earlier pending ones; the UI warns and asks for
        // a typed confirmation, and the audit trail records it.
        $outOfOrder = $selected !== array_slice($pending, 0, count($selected));

        $lock = $this->lock();

        $started = microtime(true);
        $backupState = $backup ? 'taken' : 'skipped';

        try {
            $timeout = max(30, (int) config('operations.migration_timeout', 600));
            $php = $this->commands->phpBinary();
            $output = null;

            if ($backup) {
                $backupResult = $this->processes->run([$php, base_path('artisan'), 'db:backup', '--no-ansi'], $timeout);

                if ($backupResult['exit_code'] !== 0) {
                    $backupState = 'failed';
                    $output = $this->combine(['Backup failed; no migration was run.', $backupResult['output']]);

                    $run = $this->record($selected, $backupResult['exit_code'], $output, $started, $actor, $backup, $outOfOrder);

                    return $this->result($run, $selected, $backupState, $outOfOrder);
                }

                $output = $backupResult['output'];
            }

            $command = [$php, base_path('artisan'), 'migrate', '--force', '--no-ansi'];

            foreach ($selected as $name) {
                $command[] = '--path=database/migrations/'.$name.'.php';
            }

            $migrateResult = $this->processes->run($command, $timeout);

            $output = $this->combine([$output, $migrateResult['output']]);
            $run = $this->record($selected, $migrateResult['exit_code'], $output, $started, $actor, $backup, $outOfOrder);

            return $this->result($run, $selected, $backupState, $outOfOrder);
        } finally {
            $lock->release();
        }
    }

    /** Fail closed when another run holds the lock (or the store cannot lock). */
    protected function lock(): Lock
    {
        $seconds = max(120, (int) config('operations.migration_timeout', 600));

        try {
            $lock = Cache::lock('platform:migrations:run', $seconds);

            if (! $lock->get()) {
                throw ValidationException::withMessages([
                    'migrations' => 'Another migration run is already in progress.',
                ]);
            }

            return $lock;
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            report($e);

            throw ValidationException::withMessages([
                'migrations' => 'The migration run could not be locked: '.$e->getMessage(),
            ]);
        }
    }

    /**
     * @param  list<string>  $selected
     */
    protected function record(
        array $selected,
        int $exitCode,
        string $output,
        float $started,
        ?User $actor,
        bool $backup,
        bool $outOfOrder,
    ): CommandRun {
        $run = CommandRun::create([
            'command' => 'artisan migrate --force ('.count($selected).' selected)',
            'type' => 'migration',
            'exit_code' => $exitCode,
            'output' => mb_substr($this->commands->redact($output), 0, 20000),
            'duration_ms' => (int) ((microtime(true) - $started) * 1000),
            'status' => $exitCode === 0 ? 'completed' : 'failed',
            'user_id' => $actor?->getKey(),
        ]);

        $this->audit->log('platform.migrations_run', $run, [
            'migrations' => $selected,
            'exit_code' => $exitCode,
            'backup' => $backup,
            'out_of_order' => $outOfOrder,
        ], $actor);

        return $run;
    }

    /**
     * @param  list<string>  $selected
     * @return array{
     *     exit_code: int,
     *     output: string,
     *     migrations: list<string>,
     *     backup: string,
     *     out_of_order: bool,
     *     duration_ms: int,
     *     run_id: int
     * }
     */
    protected function result(CommandRun $run, array $selected, string $backup, bool $outOfOrder): array
    {
        return [
            'exit_code' => (int) $run->exit_code,
            'output' => (string) $run->output,
            'migrations' => $selected,
            'backup' => $backup,
            'out_of_order' => $outOfOrder,
            'duration_ms' => (int) $run->duration_ms,
            'run_id' => (int) $run->getKey(),
        ];
    }

    /** @param  array<int, ?string>  $parts */
    protected function combine(array $parts): string
    {
        return trim(implode("\n", array_filter($parts, fn ($part) => $part !== null && trim($part) !== '')));
    }
}
