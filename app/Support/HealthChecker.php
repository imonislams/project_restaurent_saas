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
            'public_storage' => $this->publicStorageCheck(),
            'database_capacity' => $this->databaseCapacity(),
            'queue' => [
                'ok' => true,
                'queued' => DB::table('jobs')->count(),
                'failed' => DB::table('failed_jobs')->count(),
            ],
        ];
    }

    /**
     * Report the InnoDB buffer pool against a recommended minimum.
     *
     * QA-E-03: a 16 MB pool (the XAMPP default) was the real throughput ceiling —
     * raising it to 256 MB cut POS latency 65% and nearly tripled throughput with
     * no change in query count. The point of this check is that nobody has to
     * remember to look: the deployed host reports its own value.
     *
     * `ok` is always true so a small pool never turns /health red or blocks a
     * deploy. Enforcement belongs in `platform:check`, which exits non-zero —
     * failing the liveness probe would take the site down over a tuning setting.
     *
     * @return array<string, mixed>
     */
    public function databaseCapacity(): array
    {
        try {
            $driver = DB::connection()->getDriverName();

            if (! in_array($driver, ['mysql', 'mariadb'], true)) {
                return ['ok' => true, 'applicable' => false, 'detail' => "not applicable on {$driver}"];
            }

            $row = DB::selectOne("show variables like 'innodb_buffer_pool_size'");
            $poolMb = (int) round(((int) ($row->Value ?? 0)) / 1048576);

            $sizeRow = DB::selectOne(
                'select coalesce(sum(data_length + index_length), 0) as bytes
                 from information_schema.tables where table_schema = database()'
            );
            $dataMb = (int) round(((int) ($sizeRow->bytes ?? 0)) / 1048576);

            $minimumMb = (int) config('platform.database.min_buffer_pool_mb', 128);
            $recommended = $poolMb >= $minimumMb;

            return [
                'ok' => true,
                'applicable' => true,
                'buffer_pool_mb' => $poolMb,
                'data_mb' => $dataMb,
                'minimum_mb' => $minimumMb,
                'recommended' => $recommended,
                'detail' => $recommended
                    ? "{$poolMb} MB (data {$dataMb} MB) — meets the {$minimumMb} MB minimum"
                    : "{$poolMb} MB (data {$dataMb} MB) — BELOW the {$minimumMb} MB minimum",
            ];
        } catch (Throwable $e) {
            return ['ok' => true, 'applicable' => false, 'detail' => $e->getMessage()];
        }
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

    /**
     * The public disk must be writable and its public symlink present, otherwise
     * uploaded images (products, logos, avatars) 404 even though storage works.
     *
     * @return array<string, mixed>
     */
    protected function publicStorageCheck(): array
    {
        $result = $this->check(function () {
            $path = 'health/public-probe.txt';
            Storage::disk('public')->put($path, 'ok');
            $exists = Storage::disk('public')->exists($path);
            Storage::disk('public')->delete($path);

            return $exists;
        });

        $result['linked'] = file_exists(public_path('storage'));

        return $result;
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
