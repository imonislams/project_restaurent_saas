<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Measures the hot query shapes with and without the composite indexes that the
 * static audit flagged as missing. Read-only apart from index create/drop on *_qa.
 */
class QaMeasureIndexes extends Command
{
    protected $signature = 'qa:measure-indexes {--apply : Create the indexes to measure the after-state}';

    protected $description = 'EXPLAIN the hot query shapes to prove the composite index gap';

    /** @var array<string, array{0: string, 1: string, 2: string}> table, index name, DDL */
    protected const INDEXES = [
        'orders' => [
            'orders',
            'qa_orders_tenant_branch_placed',
            'CREATE INDEX qa_orders_tenant_branch_placed ON orders (tenant_id, branch_id, placed_at)',
        ],
        'payments' => [
            'payments',
            'qa_payments_tenant_status_paid',
            'CREATE INDEX qa_payments_tenant_status_paid ON payments (tenant_id, status, paid_at)',
        ],
        'stock_movements' => [
            'stock_movements',
            'qa_stock_movements_tenant_branch_created',
            'CREATE INDEX qa_stock_movements_tenant_branch_created ON stock_movements (tenant_id, branch_id, created_at)',
        ],
        'stock_balances' => [
            'stock_balances',
            'qa_stock_balances_tenant_branch',
            'CREATE INDEX qa_stock_balances_tenant_branch ON stock_balances (tenant_id, branch_id)',
        ],
    ];

    public function handle(): int
    {
        $tenantId = (int) DB::table('orders')->value('tenant_id');
        $branchId = (int) DB::table('branches')->where('tenant_id', $tenantId)->value('id');

        $queries = [
            'orders list' => "select * from orders where tenant_id = {$tenantId} and branch_id = {$branchId} and placed_at between '2020-01-01' and '2030-01-01' order by placed_at desc limit 25",
            'payments collected' => "select * from payments where tenant_id = {$tenantId} and status = 'succeeded' and paid_at between '2020-01-01' and '2030-01-01'",
            'stock movements' => "select * from stock_movements where tenant_id = {$tenantId} and branch_id = {$branchId} order by created_at desc limit 50",
            'stock balances' => "select * from stock_balances where tenant_id = {$tenantId} and branch_id = {$branchId}",
        ];

        if ($this->option('apply')) {
            $this->createIndexes();
        }

        $rows = [];
        foreach ($queries as $label => $sql) {
            $plan = DB::select('EXPLAIN '.$sql);
            $first = $plan[0] ?? null;
            $rows[] = [
                $label,
                $first->type ?? '?',
                $first->key ?? 'NULL',
                (string) ($first->rows ?? '?'),
                (string) ($first->filtered ?? ''),
            ];
        }

        $this->table(['Query', 'type', 'index used', 'rows', 'filtered%'], $rows);

        return self::SUCCESS;
    }

    protected function createIndexes(): void
    {
        foreach (self::INDEXES as [$table, $name, $ddl]) {
            $exists = DB::select(
                'select count(*) c from information_schema.statistics where table_schema = database() and table_name = ? and index_name = ?',
                [$table, $name],
            )[0]->c ?? 0;

            if (! $exists) {
                DB::statement($ddl);
                $this->line("created {$name}");
            }
        }
    }
}
