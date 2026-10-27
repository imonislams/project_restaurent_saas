<?php

namespace App\Listeners;

use App\Domain\Monitoring\Models\ScheduledTaskRun;
use App\Domain\Notifications\PlatformNotificationService;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;

/**
 * Persists scheduled-task execution results so the operations center can show a
 * real scheduler heartbeat (a configured schedule is not proof it ran), and
 * alerts the administrators when a task fails.
 */
class RecordScheduledTask
{
    public function finished(ScheduledTaskFinished $event): void
    {
        $this->record($event->task->command ?? 'unknown', (int) round(($event->runtime ?? 0) * 1000), 0);
    }

    public function failed(ScheduledTaskFailed $event): void
    {
        $task = $event->task->command ?? 'unknown';
        $output = mb_substr((string) $event->exception->getMessage(), 0, 1000);

        ScheduledTaskRun::create([
            'task' => $task,
            'ran_at' => now(),
            'duration_ms' => null,
            'exit_code' => 1,
            'output' => $output,
        ]);

        try {
            app(PlatformNotificationService::class)->send(
                'ops',
                'platform.monitoring.view',
                'Scheduled task failed',
                $task.' — '.mb_substr($output, 0, 180),
                'danger',
                route('platform.ops.schedule'),
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }

    protected function record(string $task, int $durationMs, int $exitCode): void
    {
        ScheduledTaskRun::create([
            'task' => $task,
            'ran_at' => now(),
            'duration_ms' => $durationMs,
            'exit_code' => $exitCode,
            'output' => null,
        ]);
    }
}
