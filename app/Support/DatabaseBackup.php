<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Portable logical snapshot of the database (all tables) written as gzipped
 * JSON. Intended as an operational safety net and to *verify* that a backup can
 * be read back; production deployments should also use native database
 * snapshots (mysqldump / managed backups).
 */
class DatabaseBackup
{
    public const DIRECTORY = 'backups';

    /** @return array{path: string, bytes: int, tables: int, rows: int} */
    public function create(): array
    {
        $snapshot = [
            'created_at' => now()->toIso8601String(),
            'driver' => DB::getDriverName(),
            'tables' => [],
        ];

        foreach ($this->tables() as $table) {
            $snapshot['tables'][$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
        }

        $encoded = gzencode(json_encode($snapshot), 9);
        $path = self::DIRECTORY.'/backup-'.now()->format('Ymd-His').'.json.gz';

        Storage::disk('local')->put($path, $encoded);

        return [
            'path' => $path,
            'bytes' => strlen($encoded),
            'tables' => count($snapshot['tables']),
            'rows' => array_sum(array_map('count', $snapshot['tables'])),
        ];
    }

    public function latest(): ?string
    {
        return collect(Storage::disk('local')->files(self::DIRECTORY))
            ->sort()
            ->last();
    }

    /** @return array{ok: bool, tables: int, rows: int, missing: list<string>, created_at: ?string, error: ?string} */
    public function verify(string $path): array
    {
        if (! Storage::disk('local')->exists($path)) {
            return ['ok' => false, 'tables' => 0, 'rows' => 0, 'missing' => [], 'created_at' => null, 'error' => 'Backup file not found.'];
        }

        $json = @gzdecode(Storage::disk('local')->get($path));

        if ($json === false) {
            return ['ok' => false, 'tables' => 0, 'rows' => 0, 'missing' => [], 'created_at' => null, 'error' => 'Backup is not valid gzip data.'];
        }

        $data = json_decode($json, true);

        if (! is_array($data) || ! isset($data['tables']) || ! is_array($data['tables'])) {
            return ['ok' => false, 'tables' => 0, 'rows' => 0, 'missing' => [], 'created_at' => null, 'error' => 'Backup payload is malformed.'];
        }

        $required = ['users', 'tenants', 'orders', 'subscriptions'];
        $missing = array_values(array_diff($required, array_keys($data['tables'])));

        return [
            'ok' => $missing === [],
            'tables' => count($data['tables']),
            'rows' => array_sum(array_map('count', $data['tables'])),
            'missing' => $missing,
            'created_at' => $data['created_at'] ?? null,
            'error' => null,
        ];
    }

    /**
     * Tables belonging to the *current* connection's database only.
     * (Schema::getTables() can list other schemas on shared servers.)
     *
     * @return list<string>
     */
    protected function tables(): array
    {
        $driver = DB::getDriverName();
        $database = DB::connection()->getDatabaseName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            return array_map(
                fn ($row) => $row->name,
                DB::select(
                    'select table_name as name from information_schema.tables where table_schema = ? and table_type = ?',
                    [$database, 'BASE TABLE'],
                ),
            );
        }

        if ($driver === 'sqlite') {
            return array_map(
                fn ($row) => $row->name,
                DB::select("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"),
            );
        }

        return array_map(
            fn ($table) => is_array($table) ? $table['name'] : $table,
            Schema::getTables(),
        );
    }

    public function prune(int $keep = 14): void
    {
        $files = collect(Storage::disk('local')->files(self::DIRECTORY))->sort()->values();

        if ($files->count() <= $keep) {
            return;
        }

        foreach ($files->slice(0, $files->count() - $keep) as $file) {
            Storage::disk('local')->delete($file);
        }
    }
}
