<?php

namespace App\Listeners;

use App\Domain\Monitoring\Models\ScheduledTaskRun;
use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;

/**
 * Persists scheduled-task execution results so the operations center can show a
 * real scheduler heartbeat (a configured schedule is not proof it ran).
 */
class RecordScheduledTask
{
    public function finished(ScheduledTaskFinished $event): void
    {
        $this->record($event->task->command ?? 'unknown', (int) round(($event->runtime ?? 0) * 1000), 0);
    }

    public function failed(ScheduledTaskFailed $event): void
    {
        ScheduledTaskRun::create([
            'task' => $event->task->command ?? 'unknown',
            'ran_at' => now(),
            'duration_ms' => null,
            'exit_code' => 1,
            'output' => mb_substr((string) $event->exception->getMessage(), 0, 1000),
        ]);
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
