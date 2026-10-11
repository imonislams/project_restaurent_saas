<?php

namespace App\Domain\BackupAndRecovery;

use App\Domain\Auditing\AuditLogger;
use App\Domain\BackupAndRecovery\Enums\BackupScope;
use App\Domain\BackupAndRecovery\Enums\RestoreStatus;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\BackupAndRecovery\Models\BackupRestore;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Tenant restoration for a shared-database tenancy model.
 *
 * This is a LOGICAL, row-level restore: tenant-owned rows in the scoped tables
 * are replaced with the snapshot; other tenants and platform-level tables are
 * left untouched. It is not a point-in-time database restore, and rows created
 * after the snapshot within the tenant scope are removed. A pre-restore
 * checkpoint is always taken first.
 */
class RestoreService
{
    public function __construct(
        protected BackupService $backups,
        protected AuditLogger $audit,
    ) {}

    public function request(Backup $backup, Tenant $tenant, string $reason, User $actor): BackupRestore
    {
        if ($backup->scope !== BackupScope::Tenant || $backup->tenant_id !== $tenant->getKey()) {
            throw ValidationException::withMessages(['backup' => 'Select a verified backup belonging to this tenant.']);
        }

        if ($backup->verification_result !== 'ok') {
            throw ValidationException::withMessages(['backup' => 'Verify the backup successfully before restoring it.']);
        }

        $record = BackupRestore::create([
            'backup_id' => $backup->getKey(),
            'tenant_id' => $tenant->getKey(),
            'scope' => 'tenant',
            'reason' => $reason,
            'status' => RestoreStatus::Approved,
            'requested_by' => $actor->getKey(),
        ]);

        $this->audit->log('platform.restore_requested', $record, [
            'backup' => $backup->getKey(),
            'reason' => $reason,
        ], $actor, $tenant->getKey());

        return $record;
    }

    /** @return array<string, mixed> */
    public function execute(BackupRestore $record, User $actor, ?User $approver = null): array
    {
        $record->loadMissing(['backup', 'tenant']);
        $backup = $record->backup;
        $tenant = $record->tenant;

        if (! $backup || ! $tenant) {
            throw ValidationException::withMessages(['backup' => 'The restore target is missing.']);
        }

        $lock = Cache::lock('tenant-restore:'.$tenant->getKey(), 300);

        if (! $lock->get()) {
            throw ValidationException::withMessages(['backup' => 'Another restore is already running for this tenant.']);
        }

        try {
            $snapshot = $this->backups->read($backup);
            $tables = $snapshot['tables'] ?? [];

            if ($tables === []) {
                throw new \RuntimeException('The backup contains no tenant tables.');
            }

            $checkpoint = $this->backups->createTenant($tenant, $actor);

            $record->forceFill([
                'status' => RestoreStatus::Running,
                'started_at' => now(),
                'checkpoint_backup_id' => $checkpoint->getKey(),
                'approved_by' => $approver?->getKey() ?? $record->approved_by,
            ])->save();

            $verification = $this->perform($tenant->getKey(), $tables);

            $record->forceFill([
                'status' => RestoreStatus::Completed,
                'completed_at' => now(),
                'verification' => $verification,
            ])->save();

            $this->audit->log('platform.restore_completed', $record, [
                'tables' => $verification['tables'],
                'ok' => $verification['ok'],
            ], $actor, $tenant->getKey());

            return $verification;
        } catch (\Throwable $e) {
            $record->forceFill([
                'status' => RestoreStatus::Failed,
                'completed_at' => now(),
                'error' => mb_substr($e->getMessage(), 0, 1000),
            ])->save();

            $this->audit->log('platform.restore_failed', $record, ['error' => $e->getMessage()], $actor, $record->tenant_id);

            throw $e;
        } finally {
            $lock->release();
        }
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $tables
     * @return array<string, mixed>
     */
    protected function perform(int $tenantId, array $tables): array
    {
        $liveIds = [];
        $othersBefore = [];

        foreach (array_keys($tables) as $table) {
            if ($table === 'tenants') {
                continue;
            }

            if (Schema::hasColumn($table, 'tenant_id')) {
                $liveIds[$table] = DB::table($table)->where('tenant_id', $tenantId)->pluck('id')->all();
                $othersBefore[$table] = DB::table($table)->where('tenant_id', '!=', $tenantId)->count();
            }
        }

        $liveIds['tenants'] = [$tenantId];
        $othersBefore['tenants'] = DB::table('tenants')->where('id', '!=', $tenantId)->count();

        // Foreign keys must be disabled outside the transaction (SQLite requirement).
        Schema::disableForeignKeyConstraints();

        try {
            DB::transaction(function () use ($tenantId, $tables, $liveIds) {
                foreach (array_reverse(array_keys($tables)) as $table) {
                    $this->deleteTenantRows($table, $tenantId, $liveIds);
                }

                foreach ($tables as $table => $rows) {
                    // The tenant record itself is platform-level and is never rewritten.
                    if ($table === 'tenants') {
                        continue;
                    }

                    foreach (array_chunk($rows, 500) as $chunk) {
                        if ($chunk !== []) {
                            DB::table($table)->insert($chunk);
                        }
                    }
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return $this->verifyIsolation($tenantId, $tables, $othersBefore);
    }

    /** @param array<string, list<int|string>> $liveIds */
    protected function deleteTenantRows(string $table, int $tenantId, array $liveIds): void
    {
        if ($table === 'tenants') {
            return; // never remove the tenant record itself
        }

        if (Schema::hasColumn($table, 'tenant_id')) {
            DB::table($table)->where('tenant_id', $tenantId)->delete();

            return;
        }

        // Child table without tenant_id: remove rows referencing a scoped parent.
        foreach ($this->foreignKeys($table) as $fk) {
            $parent = $fk['foreign_table'];

            if (empty($liveIds[$parent])) {
                continue;
            }

            DB::table($table)->whereIn($fk['column'], $liveIds[$parent])->delete();

            break;
        }
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $tables
     * @param  array<string, int>  $othersBefore
     * @return array<string, mixed>
     */
    protected function verifyIsolation(int $tenantId, array $tables, array $othersBefore): array
    {
        $problems = [];
        $rows = 0;

        foreach ($tables as $table => $snapshotRows) {
            $rows += count($snapshotRows);

            if ($table === 'tenants' || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }

            $expected = count($snapshotRows);
            $actual = DB::table($table)->where('tenant_id', $tenantId)->count();

            if ($actual !== $expected) {
                $problems[] = "{$table}: expected {$expected} rows, found {$actual}";
            }

            $othersAfter = DB::table($table)->where('tenant_id', '!=', $tenantId)->count();

            if (array_key_exists($table, $othersBefore) && $othersAfter !== $othersBefore[$table]) {
                $problems[] = "{$table}: rows belonging to other tenants changed";
            }
        }

        return [
            'tables' => count($tables),
            'rows' => $rows,
            'ok' => $problems === [],
            'problems' => $problems,
            'checked_at' => now()->toIso8601String(),
        ];
    }

    /** @return list<array{column: string, foreign_table: string}> */
    protected function foreignKeys(string $table): array
    {
        try {
            $keys = Schema::getForeignKeys($table);
        } catch (\Throwable) {
            return [];
        }

        $result = [];

        foreach ($keys as $key) {
            if (is_array($key)) {
                $columns = $key['columns'] ?? [];
                $foreignTable = $key['foreign_table'] ?? null;
            } else {
                $columns = method_exists($key, 'getColumns') ? $key->getColumns() : [];
                $foreignTable = method_exists($key, 'getForeignTable') ? $key->getForeignTable() : null;
            }

            if ($columns === [] || ! is_string($foreignTable)) {
                continue;
            }

            $result[] = ['column' => $columns[0], 'foreign_table' => $foreignTable];
        }

        return $result;
    }
}
