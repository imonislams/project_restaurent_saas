<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Monitoring\Models\ApplicationLog;
use App\Domain\Monitoring\Models\ScheduledTaskRun;
use App\Domain\PlatformAnalytics\SystemHealth;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OpsController extends Controller
{
    public function __construct(
        protected PlatformSettings $settings,
        protected AuditLogger $audit,
    ) {}

    public function queue(Request $request): Response
    {
        $failed = DB::table('failed_jobs')->orderByDesc('failed_at')->paginate(25)->withQueryString();

        return Inertia::render('Platform/Ops/Queue', [
            'queued_total' => DB::table('jobs')->count(),
            'queued_by_queue' => DB::table('jobs')->select('queue', DB::raw('count(*) as total'))->groupBy('queue')->get()
                ->map(fn ($row) => ['queue' => $row->queue, 'total' => (int) $row->total])->all(),
            'pending_batches' => DB::table('job_batches')->whereNull('finished_at')->count(),
            'failed' => [
                'data' => collect($failed->items())->map(fn ($job) => [
                    'id' => $job->uuid,
                    'queue' => $job->queue,
                    'failed_at' => $job->failed_at,
                    'exception' => mb_substr((string) $job->exception, 0, 200),
                ])->all(),
                'links' => $failed->linkCollection()->toArray(),
            ],
        ]);
    }

    public function retryFailedJob(Request $request, string $id): RedirectResponse
    {
        Artisan::call('queue:retry', ['id' => [$id]]);

        $this->audit->log('platform.failed_job_retried', null, ['id' => $id], $request->user());

        return back()->with('success', 'Job pushed back onto the queue.');
    }

    public function retryAllFailed(Request $request): RedirectResponse
    {
        Artisan::call('queue:retry', ['id' => ['all']]);

        $this->audit->log('platform.failed_jobs_retried_all', null, [], $request->user());

        return back()->with('success', 'All failed jobs queued for retry.');
    }

    public function deleteFailedJob(Request $request, string $id): RedirectResponse
    {
        Artisan::call('queue:forget', ['id' => $id]);

        $this->audit->log('platform.failed_job_deleted', null, ['id' => $id], $request->user());

        return back()->with('success', 'Failed job removed.');
    }

    public function schedule(): Response
    {
        $events = collect(app(Schedule::class)->events())->map(fn ($event) => [
            'command' => $event->command,
            'expression' => $event->expression,
            'description' => $event->description ?: null,
            'next_run' => optional($event->nextRunDate())->toIso8601String(),
        ])->all();

        return Inertia::render('Platform/Ops/Schedule', [
            'events' => $events,
            'runs' => ScheduledTaskRun::query()->latest('ran_at')->limit(30)->get()->map(fn (ScheduledTaskRun $run) => [
                'task' => $run->task,
                'ran_at' => $run->ran_at?->toIso8601String(),
                'duration_ms' => $run->duration_ms,
                'exit_code' => $run->exit_code,
                'output' => $run->output,
            ])->all(),
        ]);
    }

    public function apiErrors(Request $request): Response
    {
        if (! $request->has('level')) {
            $request->merge(['level' => 'error']);
        }

        return $this->logs($request);
    }

    public function logs(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'level' => $request->string('level')->toString(),
        ];

        return Inertia::render('Platform/Ops/Logs', [
            'logs' => ApplicationLog::query()
                ->when($filters['search'] !== '', fn ($q) => $q->where('message', 'like', '%'.$filters['search'].'%'))
                ->when($filters['level'] !== '', fn ($q) => $q->where('level', $filters['level']))
                ->latest('logged_at')
                ->paginate(50)
                ->withQueryString()
                ->through(fn (ApplicationLog $log) => [
                    'id' => $log->getKey(),
                    'level' => $log->level,
                    'message' => $log->message,
                    'channel' => $log->channel,
                    'request_id' => $log->request_id,
                    'tenant_id' => $log->tenant_id,
                    'logged_at' => $log->logged_at?->toIso8601String(),
                ]),
            'filters' => $filters,
            'levels' => ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'],
        ]);
    }

    public function health(SystemHealth $health): Response
    {
        return Inertia::render('Platform/Ops/Health', [
            'indicators' => $health->indicators(),
            'summary' => $health->summary(),
            'maintenance' => [
                'enabled' => (bool) $this->settings->get('maintenance.enabled', false),
                'message' => $this->settings->get('maintenance.message', ''),
                'ends_at' => $this->settings->get('maintenance.ends_at'),
            ],
        ]);
    }

    public function maintenance(): Response
    {
        return Inertia::render('Platform/Ops/Maintenance', [
            'maintenance' => [
                'enabled' => (bool) $this->settings->get('maintenance.enabled', false),
                'message' => $this->settings->get('maintenance.message', ''),
                'ends_at' => $this->settings->get('maintenance.ends_at'),
            ],
        ]);
    }

    public function updateMaintenance(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['boolean'],
            'message' => ['nullable', 'string', 'max:500'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $this->settings->set('maintenance.enabled', (bool) ($data['enabled'] ?? false), 'maintenance');
        $this->settings->set('maintenance.message', $data['message'] ?? '', 'maintenance');
        $this->settings->set('maintenance.ends_at', $data['ends_at'] ?? null, 'maintenance');

        $this->audit->log('platform.maintenance_updated', null, [
            'enabled' => (bool) ($data['enabled'] ?? false),
            'ends_at' => $data['ends_at'] ?? null,
        ], $request->user());

        return back()->with('success', 'Maintenance settings saved.');
    }
}
