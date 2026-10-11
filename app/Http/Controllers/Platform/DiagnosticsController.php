<?php

namespace App\Http\Controllers\Platform;

use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Monitoring\Models\ApplicationLog;
use App\Domain\PlatformAnalytics\SystemHealth;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class DiagnosticsController extends Controller
{
    public function index(SystemHealth $health): Response
    {
        $settings = app(PlatformSettings::class);
        $lastBackup = Backup::query()->latest('id')->first();

        return Inertia::render('Platform/Diagnostics', [
            'health' => $health->indicators(),
            'healthSummary' => $health->summary(),
            'platform' => [
                'php' => PHP_VERSION,
                'laravel' => app()->version(),
                'environment' => app()->environment(),
                'debug' => (bool) config('app.debug'),
                'timezone' => config('app.timezone'),
            ],
            'drivers' => [
                'database' => config('database.default'),
                'cache' => config('cache.default'),
                'queue' => config('queue.default'),
                'session' => config('session.driver'),
                'mail' => $settings->get('mail.mailer') ?? config('mail.default'),
                'filesystem' => config('filesystems.default'),
            ],
            'integrations' => [
                'gateways_enabled' => PaymentGateway::query()->where('is_enabled', true)->count(),
                'gateways_configured' => PaymentGateway::query()->count(),
                'backups_total' => Backup::query()->count(),
                'last_backup_at' => $lastBackup?->created_at?->toIso8601String(),
                'last_backup_verified' => $lastBackup?->verification_result === 'ok',
                'maintenance' => (bool) $settings->get('maintenance.enabled', false),
            ],
            'queues' => [
                'queued' => DB::table('jobs')->count(),
                'failed' => DB::table('failed_jobs')->count(),
            ],
            'errors' => [
                'last_24h' => ApplicationLog::query()->whereIn('level', ['error', 'critical', 'alert', 'emergency'])->where('logged_at', '>=', now()->subDay())->count(),
                'last_7d' => ApplicationLog::query()->whereIn('level', ['error', 'critical', 'alert', 'emergency'])->where('logged_at', '>=', now()->subDays(7))->count(),
            ],
            'storage' => [
                'disk_free' => $this->humanBytes(@disk_free_space(storage_path()) ?: 0),
                'log_size' => $this->logSize(),
            ],
        ]);
    }

    protected function logSize(): string
    {
        $path = storage_path('logs');

        if (! File::isDirectory($path)) {
            return '0 B';
        }

        $bytes = collect(File::files($path))->sum(fn ($file) => $file->getSize());

        return $this->humanBytes($bytes);
    }

    protected function humanBytes(int|float $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $value = $bytes;
        $unit = 0;

        while ($value >= 1024 && $unit < count($units) - 1) {
            $value /= 1024;
            $unit++;
        }

        return round($value, $unit === 0 ? 0 : 1).' '.$units[$unit];
    }
}
