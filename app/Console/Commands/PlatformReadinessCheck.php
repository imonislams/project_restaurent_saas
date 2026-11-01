<?php

namespace App\Console\Commands;

use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PlatformSettings\MailConfigurator;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Support\HealthChecker;
use Illuminate\Console\Command;

class PlatformReadinessCheck extends Command
{
    protected $signature = 'platform:check';

    protected $description = 'Report platform readiness: health, queue, backups, gateways, email and maintenance state';

    public function handle(HealthChecker $health): int
    {
        $settings = app(PlatformSettings::class);
        $checks = $health->run();

        $failedJobs = (int) ($checks['queue']['failed'] ?? 0);
        $queuedJobs = (int) ($checks['queue']['queued'] ?? 0);
        $lastBackup = Backup::query()->latest('id')->first();

        $rows = [
            'Database' => ($checks['database']['ok'] ?? false) ? 'ok' : 'FAILED',
            'Cache' => ($checks['cache']['ok'] ?? false) ? 'ok' : 'FAILED',
            'Storage' => ($checks['storage']['ok'] ?? false) ? 'ok' : 'FAILED',
            'Public files' => ($checks['public_storage']['linked'] ?? false) ? 'ok' : 'missing storage:link',
            'Queued jobs' => (string) $queuedJobs,
            'Failed jobs' => $failedJobs === 0 ? 'none' : "{$failedJobs} — review",
            'Last backup' => $lastBackup ? ($lastBackup->created_at?->diffForHumans() ?? 'unknown') : 'none',
            'Backup verification' => ($lastBackup?->verification_result === 'ok') ? 'ok' : 'not verified',
            'Enabled gateways' => (string) PaymentGateway::query()->where('is_enabled', true)->count(),
            'Email transport' => $this->emailTransport($settings),
            'Maintenance mode' => $settings->get('maintenance.enabled', false) ? 'ENABLED' : 'off',
        ];

        $this->line('Platform readiness');
        $this->line(str_repeat('-', 40));

        foreach ($rows as $label => $value) {
            $this->line(str_pad($label, 22).$value);
        }

        $healthy = ($checks['database']['ok'] ?? false) && ($checks['cache']['ok'] ?? false) && $failedJobs === 0;

        return $healthy ? self::SUCCESS : self::FAILURE;
    }

    /**
     * The transport mail actually goes through — not the stored setting. "log" or
     * "array" in production means nothing is delivered, which is the difference
     * between "the app sent it" and "the customer received it".
     */
    protected function emailTransport(PlatformSettings $settings): string
    {
        $transport = (string) config('mail.default');
        $from = MailConfigurator::deliverableFromAddress(
            $settings->get('mail.from_address') ?? config('mail.from.address'),
            $settings->get('mail.username'),
        );

        if (in_array($transport, ['log', 'array'], true)) {
            return $transport.' — NOT DELIVERING, configure SMTP';
        }

        if (in_array('mail.password', $settings->unreadableKeys(), true)) {
            return $transport.' — SMTP password unreadable, re-enter it';
        }

        if ($from === null) {
            return $transport.' — From address cannot deliver';
        }

        return $transport.' (from '.$from.')';
    }
}
