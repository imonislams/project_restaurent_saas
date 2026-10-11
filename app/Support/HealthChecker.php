<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Lightweight, dependency-free health probe used by the /health endpoint and
 * the app:health command.
 */
class HealthChecker
{
    /** @return array<string, array<string, mixed>> */
    public function run(): array
    {
        return [
            'database' => $this->check(fn () => DB::select('select 1') !== null),
            'cache' => $this->check(function () {
                Cache::put('health:probe', 'ok', 5);

                return Cache::get('health:probe') === 'ok';
            }),
            'storage' => $this->check(function () {
                $path = 'health/probe.txt';
                Storage::disk('local')->put($path, 'ok');

                return Storage::disk('local')->exists($path);
            }),
            'queue' => [
                'ok' => true,
                'queued' => DB::table('jobs')->count(),
                'failed' => DB::table('failed_jobs')->count(),
            ],
        ];
    }

    public function healthy(): bool
    {
        foreach ($this->run() as $check) {
            if (array_key_exists('ok', $check) && $check['ok'] === false) {
                return false;
            }
        }

        return true;
    }

    /** @return array<string, mixed> */
    protected function check(callable $probe): array
    {
        try {
            $ok = (bool) $probe();

            return ['ok' => $ok, 'detail' => $ok ? 'ok' : 'failed'];
        } catch (Throwable $e) {
            return ['ok' => false, 'detail' => $e->getMessage()];
        }
    }
}
