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
 * Measures concurrent POS contention. Each worker is a separate PHP process
 * hitting the same branch, so the order_sequences row lock is exercised for real.
 * *_qa only.
 */
class QaMeasureConcurrency extends Command
{
    protected $signature = 'qa:measure-concurrency
        {--workers=4 : Concurrent processes}
        {--sales=10 : Sales per worker}
        {--worker : Internal: run as a worker}
        {--tenant= : Internal tenant id}';

    protected $description = 'Measure POS throughput under concurrent writers';

    public function handle(): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        if ($this->option('worker')) {
            return $this->runWorker((int) $this->option('tenant'), (int) $this->option('sales'));
        }

        $workers = (int) $this->option('workers');
        $perWorker = (int) $this->option('sales');
        $tenantId = (int) DB::table('tenants')->min('id');

        $this->info("Launching {$workers} concurrent workers x {$perWorker} sales on tenant {$tenantId}…");

        $start = microtime(true);
        $procs = [];

        for ($w = 0; $w < $workers; $w++) {
            $cmd = sprintf(
                '%s %s qa:measure-concurrency --worker --tenant=%d --sales=%d 2>&1',
                escapeshellarg(PHP_BINARY),
                escapeshellarg(base_path('artisan')),
                $tenantId,
                $perWorker,
            );
            $procs[] = popen($cmd, 'r');
        }

        $failures = 0;
        foreach ($procs as $proc) {
            while (! feof($proc)) {
                $line = fgets($proc);
                if ($line !== false && str_contains($line, 'FAIL')) {
                    $failures++;
                }
            }
            pclose($proc);
        }

        $elapsed = microtime(true) - $start;
        $total = $workers * $perWorker;

        $this->table(['Metric', 'Value'], [
            ['workers', $workers],
            ['sales attempted', $total],
            ['worker failures', $failures],
            ['wall clock s', number_format($elapsed, 2)],
            ['aggregate sales/sec', number_format($total / $elapsed, 2)],
        ]);

        return self::SUCCESS;
    }

    protected function runWorker(int $tenantId, int $sales): int
    {
        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        app(TenantContext::class)->set($tenant);

        $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
        $user = User::query()->where('tenant_id', $tenantId)->first();
        $products = Product::withoutGlobalScopes()->where('tenant_id', $tenantId)->limit(6)->pluck('id')->all();
        $methodId = (int) DB::table('payment_methods')->where('tenant_id', $tenantId)->where('code', 'cash')->value('id');

        $service = app(SaleService::class);

        for ($i = 0; $i < $sales; $i++) {
            try {
                $service->place([
                    'branch_id' => $branch->id,
                    'order_type' => 'counter',
                    'items' => [['product_id' => $products[$i % count($products)], 'quantity' => 1]],
                    'payments' => [['payment_method_id' => $methodId, 'amount' => 99999, 'tendered' => 99999]],
                    'idempotency_key' => 'conc-'.getmypid().'-'.$i.'-'.uniqid(),
                ], $user, $branch);
            } catch (\Throwable $e) {
                echo 'FAIL '.get_class($e).' '.substr($e->getMessage(), 0, 60).PHP_EOL;
            }
        }

        return self::SUCCESS;
    }
}
