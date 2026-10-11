<?php

namespace App\Console\Commands;

use App\Support\DatabaseBackup;
use Illuminate\Console\Command;

class VerifyBackup extends Command
{
    protected $signature = 'db:verify-backup {file?}';

    protected $description = 'Verify that a backup can be read back and contains the core tables';

    public function handle(DatabaseBackup $backup): int
    {
        $path = $this->argument('file') ?: $backup->latest();

        if (! $path) {
            $this->error('No backup files found.');

            return self::FAILURE;
        }

        $result = $backup->verify($path);

        if (! $result['ok']) {
            $this->error('Backup verification FAILED for '.$path.' — '.($result['error'] ?? 'missing tables: '.implode(', ', $result['missing'])));

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Backup OK: %s (%d tables, %d rows, created %s)',
            $path, $result['tables'], $result['rows'], $result['created_at'] ?? 'unknown',
        ));

        return self::SUCCESS;
    }
}
