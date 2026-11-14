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
 * Category D: burst then recover. Confirms the system returns to baseline after
 * a spike, and measures connection-pool pressure. *_qa only.
 */
class QaStressRecovery extends Command
{
    protected $signature = 'qa:stress-recovery {--burst=16 : Concurrent workers in the burst} {--sales=4 : Sales per burst worker}';

    protected $description = 'Burst load, then confirm the system recovers to baseline';

    public function handle(SaleService $sales): int
    {
        if (! str_ends_with((string) config('database.connections.mysql.database'), '_qa')) {
            $this->error('Refusing to run outside a *_qa database.');

            return self::FAILURE;
        }

        $rows = [];

        // 1. Baseline before any load.
        $rows[] = ['baseline (pre-burst)', ...$this->sequential((int) $this->option('sales'), 3)];

        // 2. Burst.
        $this->line('→ burst');
        $start = microtime(true);
        $procs = [];
        $tenantId = (int) DB::table('tenants')->min('id');

        for ($w = 0; $w < (int) $this->option('burst'); $w++) {
            $cmd = sprintf(
                '%s %s qa:stress-ramp --worker --tenant=%d --count=%d 2>&1',
                escapeshellarg(PHP_BINARY),
                escapeshellarg(base_path('artisan')),
                $tenantId,
                (int) $this->option('sales'),
            );
            $procs[] = popen($cmd, 'r');
        }

        $peak = 0;
        foreach ($procs as $proc) {
            while (! feof($proc)) {
                fgets($proc);
            }
            pclose($proc);
            $peak = max($peak, $this->threads());
        }
        $burstElapsed = microtime(true) - $start;

        $rows[] = [
            'burst ('.(int) $this->option('burst').' workers)',
            (int) $this->option('burst') * (int) $this->option('sales'),
            number_format($burstElapsed, 2).'s',
            $peak,
        ];

        // 3. Recovery: wait for connections to drain, then re-measure.
        $this->line('→ waiting for recovery');
        $recovered = false;
        for ($i = 0; $i < 40; $i++) {
            if ($this->threads() <= 3) {
                $recovered = true;
                break;
            }
            usleep(250000);
        }

        $rows[] = ['post-burst (recovered='.($recovered ? 'yes' : 'no').')', ...$this->sequential((int) $this->option('sales'), 3)];

        $this->table(['Phase', 'sales', 'wall/conn', 'peak db conn'], $rows);

        $this->line('');
        $this->line('Threads_connected now: '.$this->threads());
        $this->line('Max_used_connections: '.(DB::select("show status like 'Max_used_connections'")[0]->Value ?? '?'));

        return self::SUCCESS;
    }

    /** @return array{0: int, 1: string, 2: int} */
    protected function sequential(int $sales, int $count): array
    {
        $tenant = Tenant::withoutGlobalScopes()->orderBy('id')->first();
        app(TenantContext::class)->set($tenant);

        $branch = Branch::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();
        $user = User::query()->where('tenant_id', $tenant->id)->first();
        $products = Product::withoutGlobalScopes()->where('tenant_id', $tenant->id)->limit(5)->pluck('id')->all();
        $methodId = (int) DB::table('payment_methods')->where('tenant_id', $tenant->id)->where('code', 'cash')->value('id');

        $service = app(SaleService::class);
        $start = microtime(true);
        $peak = 0;

        for ($i = 0; $i < $count; $i++) {
            for ($s = 0; $s < $sales; $s++) {
                $service->place([
                    'branch_id' => $branch->id,
                    'order_type' => 'counter',
                    'items' => [['product_id' => $products[$s % count($products)], 'quantity' => 1]],
                    'payments' => [['payment_method_id' => $methodId, 'amount' => 99999, 'tendered' => 99999]],
                    'idempotency_key' => 'rec-'.uniqid('', true),
                ], $user, $branch);
            }
            $peak = max($peak, $this->threads());
        }

        $elapsed = microtime(true) - $start;
        $total = $count * $sales;

        return [$total, number_format($elapsed, 2).'s ('.number_format($total / $elapsed, 2).'/s)', $peak];
    }

    protected function threads(): int
    {
        try {
            return (int) (DB::select("show status like 'Threads_connected'")[0]->Value ?? 0);
        } catch (\Throwable) {
            return -1;
        }
    }
}
