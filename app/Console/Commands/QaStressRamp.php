<?php

namespace App\Console\Commands;

use App\Domain\Branches\Models\Branch;
use App\Domain\Menu\Models\Product;
use App\Domain\POS\SaleService;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Category D: ramp concurrent POS writers step by step and record where
 * throughput stops scaling and errors begin. *_qa only, capped concurrency.
 */
class QaStressRamp extends Command
{
    protected $signature = 'qa:stress-ramp
        {--steps=1,2,4,8,16 : Comma-separated worker counts}
        {--sales=6 : Sales per worker per step}
        {--worker : Internal}
        {--tenant= : Internal}
        {--count= : Internal}';

    protected $description = 'Ramp concurrent POS load and find the saturation/breaking point';

    public function handle(): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        if ($this->option('worker')) {
            return $this->runWorker((int) $this->option('tenant'), (int) $this->option('count'));
        }

        $steps = array_filter(array_map('intval', explode(',', (string) $this->option('steps'))));
        $perWorker = (int) $this->option('sales');
        $tenantId = (int) DB::table('tenants')->min('id');

        $rows = [];
        $baseline = null;

        foreach ($steps as $workers) {
            // Recover between steps so one saturation point does not poison the next.
            gc_collect_cycles();
            $this->waitForQuiet();

            [$elapsed, $ok, $fail, $sat] = $this->runStep($workers, $perWorker, $tenantId);

            $attempted = $workers * $perWorker;
            $rps = $elapsed > 0 ? $attempted / $elapsed : 0;
            $baseline ??= $rps;

            $rows[] = [
                $workers,
                $attempted,
                $ok,
                $fail,
                number_format($elapsed, 2),
                number_format($rps, 2),
                number_format($baseline > 0 ? ($rps / $baseline) * 100 : 0, 0).'%',
                $sat,
            ];
        }

        $this->table(
            ['workers', 'attempted', 'ok', 'failed', 'wall s', 'sales/sec', 'vs 1 worker', 'max db conn'],
            $rows,
        );

        return self::SUCCESS;
    }

    /** @return array{0: float, 1: int, 2: int, 3: int} */
    protected function runStep(int $workers, int $perWorker, int $tenantId): array
    {
        $this->line("→ {$workers} workers × {$perWorker} sales");

        $procs = [];
        $start = microtime(true);

        for ($w = 0; $w < $workers; $w++) {
            $cmd = sprintf(
                '%s %s qa:stress-ramp --worker --tenant=%d --count=%d 2>&1',
                escapeshellarg(PHP_BINARY),
                escapeshellarg(base_path('artisan')),
                $tenantId,
                $perWorker,
            );
            $procs[] = popen($cmd, 'r');
        }

        $peakConnections = 0;
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
                    $this->warn('  '.trim($line));
                }
            }
            pclose($proc);

            $peakConnections = max($peakConnections, $this->connections());
        }

        return [microtime(true) - $start, $ok, $fail, $peakConnections];
    }

    protected function connections(): int
    {
        try {
            $row = DB::select("show status like 'Threads_connected'");

            return (int) ($row[0]->Value ?? 0);
        } catch (\Throwable) {
            return 0;
        }
    }

    protected function waitForQuiet(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $threads = $this->connections();
            if ($threads <= 3) {
                return;
            }
            usleep(250000);
        }
    }

    protected function runWorker(int $tenantId, int $sales): int
    {
        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        app(TenantContext::class)->set($tenant);

        $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
        $user = User::query()->where('tenant_id', $tenantId)->first();
        $products = Product::withoutGlobalScopes()->where('tenant_id', $tenantId)->limit(6)->pluck('id')->all();
        $methodId = (int) DB::table('payment_methods')->where('tenant_id', $tenantId)->where('code', 'cash')->value('id');

        if ($products === [] || $methodId === 0) {
            echo "FAIL incomplete dataset\n";

            return self::FAILURE;
        }

        $service = app(SaleService::class);

        for ($i = 0; $i < $sales; $i++) {
            try {
                $service->place([
                    'branch_id' => $branch->id,
                    'order_type' => 'counter',
                    'items' => [['product_id' => $products[$i % count($products)], 'quantity' => 1]],
                    'payments' => [['payment_method_id' => $methodId, 'amount' => 99999, 'tendered' => 99999]],
                    'idempotency_key' => 'stress-'.getmypid().'-'.$i.'-'.uniqid(),
                ], $user, $branch);
                echo "OK\n";
            } catch (\Throwable $e) {
                echo 'FAIL '.get_class($e).': '.str_replace("\n", ' ', substr($e->getMessage(), 0, 110))."\n";
            }
        }

        return self::SUCCESS;
    }
}
