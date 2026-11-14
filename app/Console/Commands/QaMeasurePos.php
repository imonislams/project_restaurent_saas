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
 * Measures POS sale latency and query count, plus the same for concurrent
 * contention on the order-number sequence. Writes only to *_qa.
 */
class QaMeasurePos extends Command
{
    protected $signature = 'qa:measure-pos {--sales=20 : Sequential sales to time}';

    protected $description = 'Measure POS sale write latency and query count';

    public function handle(SaleService $sales): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $tenant = Tenant::withoutGlobalScopes()->orderBy('id')->first();
        app(TenantContext::class)->set($tenant);

        $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();
        $user = User::query()->where('tenant_id', $tenant->id)->first();
        $products = Product::withoutGlobalScopes()->where('tenant_id', $tenant->id)->limit(10)->pluck('id')->all();
        $methodId = (int) DB::table('payment_methods')->where('tenant_id', $tenant->id)->where('code', 'cash')->value('id');

        if ($products === [] || $methodId === 0) {
            $this->error('Dataset incomplete for this tenant.');

            return self::FAILURE;
        }

        $timings = [];
        $queryCounts = [];

        for ($i = 0; $i < (int) $this->option('sales'); $i++) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $start = microtime(true);

            $sales->place([
                'branch_id' => $branch->id,
                'order_type' => 'counter',
                'items' => [
                    ['product_id' => $products[0], 'quantity' => 1],
                    ['product_id' => $products[1] ?? $products[0], 'quantity' => 2],
                ],
                'payments' => [['payment_method_id' => $methodId, 'amount' => 99999, 'tendered' => 99999]],
                'idempotency_key' => 'perf-'.uniqid('', true),
            ], $user, $branch);

            $timings[] = (microtime(true) - $start) * 1000;
            $queryCounts[] = count(DB::getQueryLog());
            DB::disableQueryLog();
        }

        sort($timings);
        $n = count($timings);
        $pct = fn (float $p) => $timings[min($n - 1, (int) ceil($p * $n) - 1)];

        $this->table(['Metric', 'Value'], [
            ['sales measured', $n],
            ['avg latency ms', number_format(array_sum($timings) / $n, 1)],
            ['median ms', number_format($pct(0.50), 1)],
            ['p95 ms', number_format($pct(0.95), 1)],
            ['p99 ms', number_format($pct(0.99), 1)],
            ['min ms', number_format($timings[0], 1)],
            ['max ms', number_format($timings[$n - 1], 1)],
            ['avg queries/sale', number_format(array_sum($queryCounts) / $n, 1)],
            ['max queries/sale', max($queryCounts)],
            ['throughput sales/sec', number_format(1000 / (array_sum($timings) / $n), 2)],
        ]);

        return self::SUCCESS;
    }
}
