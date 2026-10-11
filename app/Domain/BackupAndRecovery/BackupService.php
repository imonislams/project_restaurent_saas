<?php

namespace App\Domain\BackupAndRecovery;

use App\Domain\Auditing\AuditLogger;
use App\Domain\BackupAndRecovery\Enums\BackupScope;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use App\Support\DatabaseBackup;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Creates and verifies logical backups.
 *
 * A tenant backup is NOT "one table filtered by tenant_id": every table that
 * carries a tenant_id is scoped, and child tables that only reference a tenant
 * through a foreign key are resolved by walking those keys.
 */
class BackupService
{
    public function __construct(
        protected DatabaseBackup $snapshots,
        protected AuditLogger $audit,
    ) {}

    /**
     * Tables that carry a tenant_id but are platform-operational rather than
     * tenant business data. They are excluded from tenant backups (restoring
     * them would, for example, wipe the backup history itself).
     *
     * @var list<string>
     */
    protected const EXCLUDED_TENANT_TABLES = [
        'backups',
        'backup_restores',
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'migrations',
        'password_reset_tokens',
        'platform_settings',
        'payment_gateways',
        'platform_payment_events',
        'email_logs',
        'application_logs',
        'scheduled_task_runs',
    ];

    public function createPlatform(?User $actor = null): Backup
    {
        $tables = [];

        foreach ($this->snapshots->tables() as $table) {
            $tables[$table] = $this->rows($table, []);
        }

        return $this->store(BackupScope::Platform, null, $tables, $actor);
    }

    public function createTenant(Tenant $tenant, ?User $actor = null): Backup
    {
        return $this->store(BackupScope::Tenant, $tenant->getKey(), $this->scopedRows($tenant->getKey()), $actor);
    }

    /**
     * All rows owned by a tenant, discovered dynamically.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    public function scopedRows(int $tenantId): array
    {
        $tables = $this->snapshots->tables();
        $scoped = [];
        $ids = [];

        foreach ($tables as $table) {
            if ($table === 'tenants' || in_array($table, self::EXCLUDED_TENANT_TABLES, true) || ! $this->hasTenantColumn($table)) {
                continue;
            }

            $scoped[$table] = $this->rows($table, ['tenant_id' => $tenantId]);
            $ids[$table] = $this->pluck($scoped[$table], 'id');
        }

        $scoped['tenants'] = $this->rows('tenants', ['id' => $tenantId]);
        $ids['tenants'] = [$tenantId];

        // Resolve child tables that have no tenant_id but reference a scoped parent.
        for ($pass = 0; $pass < 6; $pass++) {
            $changed = false;

            foreach ($tables as $table) {
                if (isset($scoped[$table]) || in_array($table, self::EXCLUDED_TENANT_TABLES, true)) {
                    continue;
                }

                foreach ($this->foreignKeys($table) as $fk) {
                    $parent = $fk['foreign_table'];

                    if ($parent === $table || empty($ids[$parent])) {
                        continue;
                    }

                    $rows = $this->rows($table, [$fk['column'] => $ids[$parent]]);

                    if ($rows !== []) {
                        $scoped[$table] = $rows;
                        $ids[$table] = $this->pluck($rows, 'id');
                        $changed = true;
                    }

                    break;
                }
            }

            if (! $changed) {
                break;
            }
        }

        return $scoped;
    }

    /** @param array<string, list<array<string, mixed>>> $tables */
    protected function store(BackupScope $scope, ?int $tenantId, array $tables, ?User $actor): Backup
    {
        $snapshot = [
            'created_at' => now()->toIso8601String(),
            'driver' => DB::getDriverName(),
            'scope' => $scope->value,
            'tenant_id' => $tenantId,
            'tables' => $tables,
        ];

        $encoded = gzencode(json_encode($snapshot), 9);
        $encrypt = (bool) config('platform.backups.encrypt', false);
        $contents = $encrypt ? Crypt::encryptString($encoded) : $encoded;

        $path = 'backups/'.$scope->value.'-'.now()->format('Ymd-His').'-'.Str::lower(Str::random(6)).'.json.gz'.($encrypt ? '.enc' : '');
        Storage::disk('local')->put($path, $contents);

        $backup = Backup::create([
            'scope' => $scope,
            'tenant_id' => $tenantId,
            'path' => $path,
            'disk' => 'local',
            'bytes' => strlen($contents),
            'checksum' => hash('sha256', $contents),
            'encrypted' => $encrypt,
            'status' => 'completed',
            'tables_count' => count($tables),
            'rows_count' => array_sum(array_map('count', $tables)),
            'expires_at' => now()->addDays((int) (app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('operations.backup_retention_days') ?? config('platform.backups.retention_days', 30))),
            'created_by' => $actor?->getKey(),
            'meta' => ['driver' => DB::getDriverName()],
        ]);

        $this->audit->log('platform.backup_created', $backup, [
            'scope' => $scope->value,
            'tenant_id' => $tenantId,
            'rows' => $backup->rows_count,
        ], $actor, $tenantId);

        return $backup;
    }

    /** @return array<string, mixed> */
    public function read(Backup $backup): array
    {
        $contents = Storage::disk($backup->disk)->get($backup->path);

        if ($backup->encrypted) {
            $contents = Crypt::decryptString($contents);
        }

        $json = @gzdecode($contents);

        return is_string($json) ? (json_decode($json, true) ?: []) : [];
    }

    /** @return array{ok: bool, notes: string} */
    public function verify(Backup $backup): array
    {
        try {
            if (! Storage::disk($backup->disk)->exists($backup->path)) {
                throw new \RuntimeException('Backup artifact not found.');
            }

            $contents = Storage::disk($backup->disk)->get($backup->path);

            if ($backup->checksum && ! hash_equals($backup->checksum, hash('sha256', $contents))) {
                throw new \RuntimeException('Checksum mismatch — the artifact may be corrupt.');
            }

            $data = $this->read($backup);
            $tables = $data['tables'] ?? [];

            if ($tables === []) {
                throw new \RuntimeException('Backup payload is malformed.');
            }

            if (! array_key_exists('tenants', $tables)) {
                throw new \RuntimeException('Backup is missing the tenants table.');
            }

            $result = ['ok' => true, 'notes' => 'Readable; '.count($tables).' tables, '.array_sum(array_map('count', $tables)).' rows.'];
        } catch (\Throwable $e) {
            $result = ['ok' => false, 'notes' => $e->getMessage()];
        }

        $backup->forceFill([
            'verified_at' => now(),
            'verification_result' => $result['ok'] ? 'ok' : 'failed',
            'verification_notes' => $result['notes'],
        ])->save();

        $this->audit->log('platform.backup_verified', $backup, ['result' => $backup->verification_result], auth()->user(), $backup->tenant_id);

        return $result;
    }

    public function delete(Backup $backup): void
    {
        try {
            Storage::disk($backup->disk)->delete($backup->path);
        } catch (\Throwable) {
            // Artifact already gone — still remove the record.
        }

        $this->audit->log('platform.backup_deleted', $backup, ['path' => $backup->path], auth()->user(), $backup->tenant_id);
        $backup->delete();
    }

    public function prune(): int
    {
        $expired = Backup::query()->whereNotNull('expires_at')->where('expires_at', '<', now())->get();
        $count = 0;

        foreach ($expired as $backup) {
            $this->delete($backup);
            $count++;
        }

        return $count;
    }

    protected function hasTenantColumn(string $table): bool
    {
        try {
            return Schema::hasColumn($table, 'tenant_id');
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @return list<array{column: string, foreign_table: string}>
     */
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

    /**
     * @param  array<string, mixed>  $wheres
     * @return list<array<string, mixed>>
     */
    protected function rows(string $table, array $wheres): array
    {
        $query = DB::table($table);

        foreach ($wheres as $column => $value) {
            if (is_array($value)) {
                if ($value === []) {
                    return [];
                }
                $query->whereIn($column, $value);
            } else {
                $query->where($column, $value);
            }
        }

        return $query->get()->map(fn ($row) => (array) $row)->all();
    }

    /** @return list<int|string> */
    protected function pluck(array $rows, string $column): array
    {
        return array_values(array_filter(array_map(fn ($row) => $row[$column] ?? null, $rows), fn ($v) => $v !== null));
    }
}
