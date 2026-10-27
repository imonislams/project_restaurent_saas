<?php

namespace App\Listeners;

use App\Domain\Notifications\PlatformNotificationService;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Str;

/**
 * Tells the administrators when a queued job fails. The live host drains the
 * queue from cron, so without this a failure would sit unnoticed in failed_jobs.
 */
class NotifyPlatformOnFailedJob
{
    public function handle(JobFailed $event): void
    {
        $job = $event->job?->resolveName() ?: 'A queued job';
        $reason = trim((string) $event->exception?->getMessage()) ?: 'Unknown error';

        try {
            app(PlatformNotificationService::class)->send(
                'ops',
                'platform.monitoring.view',
                'Queued job failed',
                $job.' — '.Str::limit($reason, 180),
                'danger',
                route('platform.ops.failed-jobs'),
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
