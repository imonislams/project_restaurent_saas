<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Operations\CommandRunner;
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
        protected AuditLogger $audit,
    ) {}

    public function index(): Response
    {
        $advancedEnabled = (bool) app(PlatformSettings::class)->get('features.command_terminal', false);

        return Inertia::render('Platform/Ops/Commands', [
            'curated' => collect($this->runner->curated())->map(fn ($action, $key) => [
                'key' => $key,
                'label' => $action['label'],
                'command' => $this->runner->resolve($action['command']),
                'danger' => $action['danger'],
            ])->values(),
            'advanced' => [
                'enabled' => $advancedEnabled,
                'is_super_admin' => (bool) request()->user()?->hasRole(\App\Domain\Identity\Enums\RoleName::SaasSuperAdmin),
                'allowed_prefixes' => $this->runner->allowedPrefixes(),
            ],
            'runs' => CommandRun::query()->with('user:id,name')->latest('id')->limit(25)->get()->map(fn (CommandRun $run) => [
                'id' => $run->getKey(),
                'command' => $run->command,
                'type' => $run->type,
                'status' => $run->status,
                'exit_code' => $run->exit_code,
                'duration_ms' => $run->duration_ms,
                'output' => $run->output,
                'user' => $run->user?->name,
                'created_at' => $run->created_at?->toIso8601String(),
            ]),
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

        abort_unless($user?->hasRole(\App\Domain\Identity\Enums\RoleName::SaasSuperAdmin), 403, 'Only the SaaS super admin can use the advanced terminal.');
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
}
