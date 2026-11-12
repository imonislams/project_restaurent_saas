<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\BackupAndRecovery\Enums\BackupScope;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Operations\CommandRunner;
use App\Domain\Operations\MigrationManager;
use App\Domain\Operations\Models\CommandRun;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CommandController extends Controller
{
    public function __construct(
        protected CommandRunner $runner,
        protected MigrationManager $migrations,
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        $advancedEnabled = (bool) app(PlatformSettings::class)->get('features.command_terminal', false);
        $lastBackup = Backup::query()->where('scope', BackupScope::Platform->value)->latest('id')->first();
        $lastMigrationRun = CommandRun::query()->with('user:id,name')->where('type', 'migration')->latest('id')->first();

        return Inertia::render('Platform/Ops/Commands', [
            'curated' => collect($this->runner->curated())->map(fn ($action, $key) => [
                'key' => $key,
                'label' => $action['label'],
                'command' => $this->runner->resolve($action['command']),
                'danger' => $action['danger'],
            ])->values(),
            'advanced' => [
                'enabled' => $advancedEnabled,
                'is_super_admin' => (bool) request()->user()?->hasRole(RoleName::SaasSuperAdmin),
                'allowed_prefixes' => $this->runner->allowedPrefixes(),
            ],
            'runs' => CommandRun::query()->with('user:id,name')->latest('id')->limit(25)->get()
                ->map(fn (CommandRun $run) => $this->runRow($run)),
            'migrations' => [
                ...$this->migrations->state(),
                'last_backup' => $lastBackup ? [
                    'taken_at' => $lastBackup->created_at?->toIso8601String(),
                    'verified' => $lastBackup->verification_result === 'ok',
                ] : null,
                'last_run' => $lastMigrationRun ? $this->runRow($lastMigrationRun) : null,
            ],
        ]);
    }

    public function runCurated(Request $request): RedirectResponse
    {
        $data = $request->validate(['key' => ['required', 'string']]);
        $action = $this->runner->curated()[$data['key']] ?? null;

        if (! $action) {
            throw ValidationException::withMessages(['key' => 'Unknown command.']);
        }

        $run = $this->runner->run($action['command'], 'curated', $request->user());

        $this->audit->log('platform.command_ran', $run, ['command' => $run->command, 'exit_code' => $run->exit_code], $request->user());

        return back()->with($run->exit_code === 0 ? 'success' : 'error', "{$action['label']}: ".($run->exit_code === 0 ? 'completed' : 'failed').'. See output below.');
    }

    public function runAdvanced(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user?->hasRole(RoleName::SaasSuperAdmin), 403, 'Only the SaaS super admin can use the advanced terminal.');
        abort_unless((bool) app(PlatformSettings::class)->get('features.command_terminal', false), 403, 'The advanced terminal is disabled.');

        $data = $request->validate(['command' => ['required', 'string', 'max:500']]);
        $command = trim($data['command']);

        if (! $this->runner->advancedAllowed($command)) {
            throw ValidationException::withMessages(['command' => 'That command is not permitted.']);
        }

        $run = $this->runner->run($command, 'advanced', $user);

        $this->audit->log('platform.command_ran', $run, ['command' => $command, 'exit_code' => $run->exit_code, 'advanced' => true], $user);

        return back()->with($run->exit_code === 0 ? 'success' : 'error', 'Command finished with exit code '.$run->exit_code.'.');
    }

    /**
     * Execute only the selected pending migrations. The selection is re-validated
     * against the live pending set inside MigrationManager.
     */
    public function runMigrations(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'migrations' => ['required', 'array', 'min:1'],
            'migrations.*' => ['string', 'max:255'],
            'backup' => ['boolean'],
        ]);

        $result = $this->migrations->run($data['migrations'], $request->user(), (bool) ($data['backup'] ?? true));

        $count = count($result['migrations']);
        $applied = $count.' migration'.($count === 1 ? '' : 's');

        if ($result['exit_code'] === 0) {
            return back()->with('success', $applied.' applied successfully.');
        }

        if ($result['backup'] === 'failed') {
            return back()->with('error', 'The pre-run database backup failed, so no migration was run. See the output below.');
        }

        return back()->with('error', 'Migration run failed with exit code '.$result['exit_code'].'. See the output below.');
    }

    /** @return array<string, mixed> */
    protected function runRow(CommandRun $run): array
    {
        return [
            'id' => $run->getKey(),
            'command' => $run->command,
            'type' => $run->type,
            'status' => $run->status,
            'exit_code' => $run->exit_code,
            'duration_ms' => $run->duration_ms,
            'output' => $run->output,
            'user' => $run->user?->name,
            'created_at' => $run->created_at?->toIso8601String(),
        ];
    }
}
