<?php

namespace App\Domain\PlatformAnalytics;

use App\Support\DatabaseBackup;
use App\Support\HealthChecker;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Platform system-health snapshot. Real checks are reported as-is; capabilities
 * that are not monitored yet are surfaced as explicit "unavailable" states
 * rather than fabricated green lights.
 */
class SystemHealth
{
    public function __construct(
        protected HealthChecker $checker,
        protected DatabaseBackup $backup,
    ) {}

    /** @return list<array<string, mixed>> */
    public function indicators(): array
    {
        $checks = $this->checker->run();
        $now = Carbon::now();

        $indicators = [
            $this->indicator('application', 'Application', 'ok', 'Running', $now),
            $this->indicator('database', 'Database', $this->status($checks['database']['ok'] ?? false), (string) ($checks['database']['detail'] ?? ''), $now),
            $this->indicator('cache', 'Cache', $this->status($checks['cache']['ok'] ?? false), (string) ($checks['cache']['detail'] ?? ''), $now),
            $this->indicator('storage', 'Storage', $this->status($checks['storage']['ok'] ?? false), (string) ($checks['storage']['detail'] ?? ''), $now),
        ];

        $queued = (int) ($checks['queue']['queued'] ?? 0);
        $failed = (int) ($checks['queue']['failed'] ?? 0);
        $indicators[] = $this->indicator('queue', 'Queue', $failed > 0 ? 'warn' : 'ok', "{$queued} queued · {$failed} failed", $now);

        $indicators[] = $this->unavailable('scheduler', 'Scheduler', 'Heartbeat monitoring arrives with system operations (Phase 6)');
        $indicators[] = $this->unavailable('email', 'Email delivery', 'Delivery monitoring arrives with email operations (Phase 6)');
        $indicators[] = $this->unavailable('gateway', 'Payment gateway', 'Configured with SSLCommerz payments (Phase 5)');
        $indicators[] = $this->backupIndicator($now);
        $indicators[] = $this->unavailable('maintenance', 'Maintenance mode', 'Maintenance controls arrive with system operations (Phase 6)');

        return $indicators;
    }

    /** @return array<string, mixed> */
    public function summary(): array
    {
        $indicators = $this->indicators();
        $counts = ['ok' => 0, 'warn' => 0, 'error' => 0, 'unavailable' => 0];

        foreach ($indicators as $indicator) {
            $counts[$indicator['status']] = ($counts[$indicator['status']] ?? 0) + 1;
        }

        return [
            'state' => $counts['error'] > 0 ? 'error' : ($counts['warn'] > 0 ? 'warn' : 'ok'),
            'counts' => $counts,
        ];
    }

    /** @return array<string, mixed> */
    protected function indicator(string $key, string $label, string $status, string $detail, Carbon $checkedAt): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'status' => $status,
            'detail' => $detail,
            'checked_at' => $checkedAt->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    protected function unavailable(string $key, string $label, string $reason): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'status' => 'unavailable',
            'detail' => $reason,
            'checked_at' => null,
        ];
    }

    /** @return array<string, mixed> */
    protected function backupIndicator(Carbon $now): array
    {
        $latest = $this->backup->latest();

        if (! $latest) {
            return $this->unavailable('backup', 'Last backup', 'No backup artifact found yet');
        }

        $disk = Storage::disk('local');

        try {
            $modified = $disk->lastModified($latest);
            $size = $disk->size($latest);
        } catch (\Throwable) {
            return $this->unavailable('backup', 'Last backup', 'Backup metadata could not be read');
        }

        $ageHours = ($now->timestamp - $modified) / 3600;
        $fresh = $ageHours <= (int) config('platform.backup_freshness_hours', 36);

        return [
            'key' => 'backup',
            'label' => 'Last backup',
            'status' => $fresh ? 'ok' : 'warn',
            'detail' => $this->humanAgo($modified).' · '.$this->humanSize($size),
            'checked_at' => Carbon::createFromTimestamp($modified)->toIso8601String(),
        ];
    }

    protected function status(bool $ok): string
    {
        return $ok ? 'ok' : 'error';
    }

    protected function humanAgo(int $timestamp): string
    {
        return Carbon::createFromTimestamp($timestamp)->diffForHumans();
    }

    protected function humanSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $value = $bytes;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            $unit++;
        }

        return round($value, $value < 10 && $unit > 0 ? 1 : 0).' '.$units[$unit];
    }
}
