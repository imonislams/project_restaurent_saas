<?php

namespace App\Console\Commands;

use App\Support\DatabaseBackup;
use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--keep=14}';

    protected $description = 'Write a portable gzipped snapshot of the database';

    public function handle(DatabaseBackup $backup): int
    {
        $result = $backup->create();
        $backup->prune((int) $this->option('keep'));

        $this->info(sprintf(
            'Backup written: %s (%d tables, %d rows, %d bytes)',
            $result['path'], $result['tables'], $result['rows'], $result['bytes'],
        ));

        return self::SUCCESS;
    }
}
