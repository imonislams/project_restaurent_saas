<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Category D: proves the POS contention is per-branch, not global. Concurrent
 * workers spread across distinct branches should scale; concentrated on one
 * branch they should not. *_qa only.
 */
class QaStressBranchIsolation extends Command
{
    protected $signature = 'qa:stress-branch-isolation
        {--workers=8 : Total concurrent workers}
        {--sales=4 : Sales per worker}
        {--mode=same : same|spread}';

    protected $description = 'Compare concurrent POS across one branch vs many branches';

    public function handle(): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $workers = (int) $this->option('workers');
        $sales = (int) $this->option('sales');
        $mode = (string) $this->option('mode');

        // Distinct tenants (and therefore distinct branches AND distinct sequence
        // rows) for spread mode; one tenant for same mode.
        $tenantIds = $mode === 'spread'
            ? DB::table('tenants')->orderBy('id')->limit($workers)->pluck('id')->all()
            : array_fill(0, $workers, (int) DB::table('tenants')->min('id'));

        if (count($tenantIds) < $workers) {
            $this->error('Not enough tenants for spread mode.');

            return self::FAILURE;
        }

        $start = microtime(true);
        $procs = [];

        foreach ($tenantIds as $tenantId) {
            $cmd = sprintf(
                '%s %s qa:stress-ramp --worker --tenant=%d --count=%d 2>&1',
                escapeshellarg(PHP_BINARY),
                escapeshellarg(base_path('artisan')),
                $tenantId,
                $sales,
            );
            $procs[] = popen($cmd, 'r');
        }

        $ok = 0;
        $fail = 0;
        foreach ($procs as $proc) {
            while (! feof($proc)) {
                $line = fgets($proc);
                if ($line === false) {
                    continue;
                }
                if (str_contains($line, 'OK')) {
                    $ok++;
                }
                if (str_contains($line, 'FAIL')) {
                    $fail++;
                }
            }
            pclose($proc);
        }

        $elapsed = microtime(true) - $start;
        $total = $workers * $sales;

        $this->table(['Metric', 'Value'], [
            ['mode', $mode],
            ['workers', $workers],
            ['attempted', $total],
            ['ok', $ok],
            ['failed', $fail],
            ['wall clock s', number_format($elapsed, 2)],
            ['sales/sec', number_format($total / $elapsed, 2)],
            ['distinct sequence rows', count(array_unique($tenantIds))],
        ]);

        return self::SUCCESS;
    }
}
