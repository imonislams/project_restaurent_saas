<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Copies the QA load-test tenants into the main database, isolated and reversible.
 *
 * Strategy: every imported row gets +1,000,000 on its primary key AND on its
 * tenant_id, so (a) nothing collides with real ids and (b) every imported row is
 * identifiable by id >= 1,000,000 for a clean delete.
 *
 * Schemas are verified identical, so relationships survive the offset intact.
 * role_user references the existing global roles by slug instead of duplicating them.
 *
 * Run with --dry-run first. Writes only inside a transaction.
 */
class QaImportToMain extends Command
{
    protected $signature = 'qa:import-to-main
        {--from=1 : First QA tenant id}
        {--to=100 : Last QA tenant id}
        {--offset=1000000 : Id offset applied to ids and tenant_id}
        {--dry-run : Report what would happen without writing}';

    protected $description = 'Copy QA tenants into the main database with id offset (reversible)';

    private const MAIN = 'mysql';

    private const QA = 'qa';

    public function handle(): int
    {
        $offset = (int) $this->option('offset');
        $from = (int) $this->option('from');
        $to = (int) $this->option('to');
        $dry = (bool) $this->option('dry-run');

        $mainName = (string) config('database.connections.mysql.database');
        if (str_ends_with($mainName, '_qa')) {
            $this->error('Refusing to run: the default connection points at a *_qa database.');

            return self::FAILURE;
        }

        // Register the QA connection for this run only.
        config([
            'database.connections.qa' => array_merge(
                config('database.connections.mysql'),
                ['database' => $mainName.'_qa'],
            ),
        ]);

        $this->info(sprintf(
            '%s QA tenants %d–%d into "%s" with id offset +%d',
            $dry ? 'DRY RUN:' : 'Importing', $from, $to, $mainName, $offset,
        ));

        // Safety: the offset must clear every existing id.
        $maxTenant = (int) DB::connection(self::MAIN)->table('tenants')->max('id');
        if ($from + $offset <= $maxTenant) {
            $this->error("Offset too small: tenant {$from}+{$offset} <= existing max {$maxTenant}.");

            return self::FAILURE;
        }

        $plan = $this->buildPlan($from, $to);
        $this->table(['Table', 'QA rows', 'Strategy'], $plan);

        $totalRows = array_sum(array_map(fn ($r) => $r[1], $plan));
        $this->line('Total rows to copy: '.number_format($totalRows));

        if ($dry) {
            $this->warn('Dry run — nothing written.');

            return self::SUCCESS;
        }

        DB::connection(self::MAIN)->beginTransaction();

        // Snapshot the real tenant count before any write, so the integrity check
        // can prove the existing data was not disturbed.
        $this->realTenantCount = (int) DB::connection(self::MAIN)
            ->table('tenants')->where('id', '<', $offset)->count();

        // The schema contains genuine FK cycles (orders -> order_rounds ->
        // kitchen_tickets -> order_rounds), so no insert order can satisfy every
        // constraint. Foreign-key checks are therefore suspended for the copy and
        // integrity is verified explicitly afterwards by verifyIntegrity().
        DB::connection(self::MAIN)->statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            $done = 0;

            // The tenant rows themselves are the root of everything else, and
            // `tenants` carries no tenant_id column of its own — so it is copied
            // explicitly first, selecting on its own `id`.
            $this->copyTenants($from, $to, $offset);
            $this->line('  copied tenants');

            foreach ($plan as [$table, $count, $strategy]) {
                if ($count === 0) {
                    continue;
                }
                $this->copyTable($table, $strategy, $from, $to, $offset);
                $done++;
                $this->line("  copied {$table} ({$count})");
            }

            // role_user has no tenant_id: map the QA user rows onto the main
            // database's role ids by slug, so imported users keep their roles
            // without duplicating the global role rows.
            $this->copyRoleAssignments($from, $to, $offset);

            DB::connection(self::MAIN)->statement('SET FOREIGN_KEY_CHECKS=1');

            $problems = $this->verifyIntegrity($offset);

            if ($problems !== []) {
                DB::connection(self::MAIN)->rollBack();

                foreach ($problems as $p) {
                    $this->error('  '.$p);
                }
                $this->error('Integrity check failed — rolled back, main database unchanged.');

                return self::FAILURE;
            }

            DB::connection(self::MAIN)->commit();
            $this->info("Committed {$done} tables; integrity verified.");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            DB::connection(self::MAIN)->rollBack();
            $this->error('Rolled back: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Tables to copy, in parent-first order, with how each row is rewritten.
     *
     * @return list<array{0: string, 1: int, 2: string}>
     */
    protected function buildPlan(int $from, int $to): array
    {
        $plan = [];

        foreach ($this->tenantTables() as $table) {
            $count = (int) DB::connection(self::QA)->table($table)
                ->whereBetween('tenant_id', [$from, $to])->count();

            $strategy = $this->hasId($table) ? 'offset-id-and-tenant' : 'offset-tenant-only';
            $plan[] = [$table, $count, $strategy];
        }

        return $plan;
    }

    /** Tables carrying tenant_id that hold rows for the selected tenants. */
    protected function tenantTables(): array
    {
        $tables = DB::connection(self::QA)->select(
            "select table_name from information_schema.columns
             where table_schema = database() and column_name = 'tenant_id'
             order by table_name"
        );

        return array_map(fn ($r) => $r->table_name, $tables);
    }

    protected function hasId(string $table): bool
    {
        return DB::connection(self::QA)->select(
            "select 1 from information_schema.columns
             where table_schema = database() and table_name = ? and column_name = 'id' limit 1",
            [$table],
        ) !== [];
    }

    protected function columnsOf(string $table): array
    {
        return array_map(
            fn ($r) => $r->column_name,
            DB::connection(self::QA)->select(
                "select column_name from information_schema.columns
                 where table_schema = database() and table_name = ? order by ordinal_position",
                [$table],
            ),
        );
    }

    /**
     * Column expressions that shift every id that points at copied data.
     *
     * Shifting only `id` and `tenant_id` is not enough: unique keys such as
     * branch_user(user_id, branch_id) and product_availability(product_id,
     * branch_id) would still collide with real rows. So every foreign-key column
     * that references a table we are copying is shifted as well, derived from the
     * FK metadata rather than guessed from the column name.
     */
    protected function offsetExpressions(string $table, array $columns, int $offset): array
    {
        $shifted = $this->shiftedTables();
        $fkMap = $this->foreignKeys($table);
        $exprs = [];

        foreach ($columns as $c) {
            $shift = false;

            if ($c === 'tenant_id' || $c === 'id') {
                $shift = true;
            } elseif (isset($fkMap[$c]) && in_array($fkMap[$c], $shifted, true)) {
                // Points at a table whose ids we are shifting.
                $shift = true;
            }

            // Nullable ids must stay null: NULL + offset is NULL in MySQL, but
            // spelling it out avoids relying on that.
            $exprs[] = $shift
                ? "if(`{$c}` is null, null, `{$c}` + {$offset}) as `{$c}`"
                : "`{$c}`";
        }

        return $exprs;
    }

    /** @var array<string,string>|null column => referenced table, per table */
    private array $fkCache = [];

    /** @return array<string,string> */
    protected function foreignKeys(string $table): array
    {
        if (isset($this->fkCache[$table])) {
            return $this->fkCache[$table];
        }

        $rows = DB::connection(self::QA)->select(
            'select column_name, referenced_table_name
             from information_schema.key_column_usage
             where table_schema = database() and table_name = ? and referenced_table_name is not null',
            [$table],
        );

        $map = [];
        foreach ($rows as $r) {
            $map[$r->column_name] = $r->referenced_table_name;
        }

        return $this->fkCache[$table] = $map;
    }

    /** @var list<string>|null */
    private ?array $shiftedTablesCache = null;

    /** Tables whose `id` values are being shifted: those carrying tenant_id. */
    protected function shiftedTables(): array
    {
        return $this->shiftedTablesCache ??= array_merge(
            $this->tenantTables(),
            ['tenants'],
        );
    }

    /**
     * Explicit integrity checks, standing in for the FK constraints that were
     * disabled during the copy. Every one must pass before the commit.
     *
     * @return list<string>
     */
    protected function verifyIntegrity(int $offset): array
    {
        $main = DB::connection(self::MAIN);
        $problems = [];

        // Sub-selects must be materialised first: a correlated subquery inside
        // whereNotIn re-evaluates against the outer row and reports false orphans.
        $tenantIds = $main->table('tenants')->where('id', '>=', $offset)->pluck('id')->all();
        $branchIds = $main->table('branches')->where('id', '>=', $offset)->pluck('id')->all();
        $orderIds = $main->table('orders')->where('id', '>=', $offset)->pluck('id')->all();
        $userIds = $main->table('users')->where('id', '>=', $offset)->pluck('id')->all();

        // 1. Something must have been imported.
        if ($tenantIds === []) {
            return ['no imported tenants found at or above the offset'];
        }

        // 2. Every imported user belongs to an imported tenant.
        $orphanUsers = $main->table('users')
            ->whereIn('id', $userIds)
            ->whereNotIn('tenant_id', $tenantIds)
            ->count();
        if ($orphanUsers > 0) {
            $problems[] = "{$orphanUsers} imported users point at a missing tenant";
        }

        // 3. Every imported order belongs to an imported tenant and branch.
        $badTenant = $main->table('orders')->whereIn('id', $orderIds)
            ->whereNotIn('tenant_id', $tenantIds)->count();
        $badBranch = $main->table('orders')->whereIn('id', $orderIds)
            ->whereNotIn('branch_id', $branchIds)->count();

        if ($badTenant > 0) {
            $problems[] = "{$badTenant} imported orders point at a missing tenant";
        }
        if ($badBranch > 0) {
            $problems[] = "{$badBranch} imported orders point at a missing branch";
        }

        // 4. Order items resolve to their order.
        $orphanItems = $main->table('order_items')
            ->where('id', '>=', $offset)
            ->whereNotIn('order_id', $orderIds)
            ->count();
        if ($orphanItems > 0) {
            $problems[] = "{$orphanItems} imported order_items point at a missing order";
        }

        // 5. Every imported user holds at least one role.
        $usersWithRole = $main->table('role_user')
            ->whereIn('user_id', $userIds)
            ->pluck('user_id')->unique()->all();

        $roleless = count(array_diff($userIds, $usersWithRole));
        if ($roleless > 0) {
            $this->line('  DEBUG userIds='.count($userIds)
                .' withRole='.count($usersWithRole)
                .' roleless='.implode(',', array_slice(array_diff($userIds, $usersWithRole), 0, 5)));
            $problems[] = "{$roleless} imported users have no role assignment";
        }

        // 6. Every imported row sits inside the offset range, so deleting
        //    id >= offset removes exactly what was added. `tenants` is the root
        //    and has no tenant_id column of its own.
        foreach (['users', 'orders', 'products', 'branches'] as $t) {
            $strayed = $main->table($t)
                ->where('id', '>=', $offset)
                ->where('tenant_id', '<', $offset)
                ->count();
            if ($strayed > 0) {
                $problems[] = "{$strayed} rows in {$t} have an offset id but a non-offset tenant_id";
            }
        }

        // 7. The real tenants must be untouched.
        $realTenants = $main->table('tenants')->where('id', '<', $offset)->count();
        if ($realTenants !== $this->realTenantCount) {
            $problems[] = "real tenant count changed: {$this->realTenantCount} -> {$realTenants}";
        }

        return $problems;
    }

    private int $realTenantCount = 0;

    /**
     * Copy the tenant rows themselves. Selected on `id` because the table has no
     * tenant_id column. Slugs are unique, so the imported ones get a qa- prefix;
     * names are kept so the data is recognisable in the UI.
     */
    protected function copyTenants(int $from, int $to, int $offset): void
    {
        $columns = $this->columnsOf('tenants');
        $exprs = [];

        foreach ($columns as $c) {
            $exprs[] = match ($c) {
                'id' => "`id` + {$offset} as `id`",
                'slug' => "concat('qa-', `slug`, '-', `id`) as `slug`",
                // business_email is unique across the table and QA tenant 1 uses
                // the same address as the real Demo Restaurant.
                'business_email' => "concat('qa+tenant', `id` + {$offset}, '@example.test') as `business_email`",
                default => "`{$c}`",
            };
        }

        $colList = '`'.implode('`,`', $columns).'`';

        DB::connection(self::MAIN)->statement(
            "insert into `tenants` ({$colList})
             select ".implode(', ', $exprs)."
             from `tenants`
             where id between ? and ?",
            [$from, $to],
        );
    }

    protected function copyTable(string $table, string $strategy, int $from, int $to, int $offset): void
    {
        $columns = $this->columnsOf($table);
        $exprs = $this->offsetExpressions($table, $columns, $offset);

        // users.email (and the phone, if set) are unique across the whole
        // database. QA tenant 1 collides with the real Demo Restaurant owner at
        // owner@example.com, so imported addresses are rewritten to a reserved
        // qa+ namespace. The password hash is preserved, so they stay usable.
        if ($table === 'users') {
            $exprs = array_map(function (string $expr) use ($offset) {
                if (str_starts_with($expr, '`email`')) {
                    return "concat('qa+', `id` + {$offset}, '@example.test') as `email`";
                }
                if (str_starts_with($expr, '`phone`')) {
                    return 'null as `phone`';
                }

                return $expr;
            }, $exprs);
        }

        $colList = '`'.implode('`,`', $columns).'`';

        DB::connection(self::MAIN)->statement(
            "insert into `{$table}` ({$colList})
             select ".implode(', ', $exprs)."
             from `{$table}`
             where tenant_id between ? and ?"
                , [$from, $to],
        );
    }

    /**
     * Recreate role_user for the imported users.
     *
     * QA role ids mean nothing in the main database, so each assignment is
     * resolved through the role's slug. Global system roles are shared (no copy);
     * any tenant-scoped custom role is offset like everything else.
     */
    protected function copyRoleAssignments(int $from, int $to, int $offset): void
    {
        $rows = DB::connection(self::QA)->select(
            'select ru.user_id, ru.role_id, ru.branch_id, r.slug, r.tenant_id as role_tenant
             from role_user ru
             join roles r on r.id = ru.role_id
             join users u on u.id = ru.user_id
             where u.tenant_id between ? and ?',
            [$from, $to],
        );

        if ($rows === []) {
            return;
        }

        $inserted = 0;

        foreach ($rows as $row) {
            $roleId = $row->role_tenant === null
                // Global role: reuse the main database's row with the same slug.
                ? DB::connection(self::MAIN)->table('roles')
                    ->where('slug', $row->slug)->whereNull('tenant_id')->value('id')
                // Tenant-owned custom role: shifted like its parent tenant.
                : (int) $row->role_id + $offset;

            if ($roleId === null) {
                $this->warn("  role slug '{$row->slug}' not found in main — skipped");

                continue;
            }

            DB::connection(self::MAIN)->table('role_user')->insertOrIgnore([
                'user_id' => (int) $row->user_id + $offset,
                'role_id' => $roleId,
                'branch_id' => $row->branch_id === null ? null : (int) $row->branch_id + $offset,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $inserted++;
        }

        $this->line("  copied role_user ({$inserted} assignments)");
    }
}
