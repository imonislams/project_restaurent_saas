<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Composite indexes for the hot POS/report query shapes, confirmed missing with
 * EXPLAIN against the QA dataset (see reports/qa/load-performance-report.md).
 *
 * Each is keyed tenant-first to match the global tenant scope that prefixes
 * almost every query in the application.
 *
 * Guarded by hasIndex-style checks so a re-run, or a database where the index
 * was added manually, is a no-op rather than an error.
 */
return new class extends Migration
{
    /** @var array<int, array{0: string, 1: string, 2: list<string>}> */
    private array $indexes = [
        // /orders list: tenant + branch + placed_at range, ordered by placed_at.
        ['orders', 'orders_tenant_branch_placed_index', ['tenant_id', 'branch_id', 'placed_at']],

        // Collected-payments reporting: tenant + status + paid_at window.
        ['payments', 'payments_tenant_status_paid_index', ['tenant_id', 'status', 'paid_at']],

        // Stock ledger: tenant + branch, ordered by created_at (fastest-growing table).
        ['stock_movements', 'stock_movements_tenant_branch_created_index', ['tenant_id', 'branch_id', 'created_at']],

        // Stock balances: tenant + branch; the inventory report has no other filter.
        ['stock_balances', 'stock_balances_tenant_branch_index', ['tenant_id', 'branch_id']],
    ];

    public function up(): void
    {
        foreach ($this->indexes as [$table, $name, $columns]) {
            if (! Schema::hasTable($table) || $this->hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
                $blueprint->index($columns, $name);
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as [$table, $name]) {
            if (! Schema::hasTable($table) || ! $this->hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($name) {
                $blueprint->dropIndex($name);
            });
        }
    }

    private function hasIndex(string $table, string $name): bool
    {
        $connection = Schema::getConnection();
        $driver = $connection->getDriverName();

        if ($driver === 'sqlite') {
            $rows = $connection->select(
                "select name from sqlite_master where type = 'index' and tbl_name = ? and name = ?",
                [$table, $name],
            );

            return $rows !== [];
        }

        $rows = $connection->select(
            'select 1 from information_schema.statistics where table_schema = database() and table_name = ? and index_name = ? limit 1',
            [$table, $name],
        );

        return $rows !== [];
    }
};
