<?php

namespace App\Console\Commands;

use App\Domain\BackupAndRecovery\BackupService;
use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup';

    protected $description = 'Write a portable, metadata-tracked snapshot of the database';

    public function handle(BackupService $backups): int
    {
        $backup = $backups->createPlatform();
        $pruned = $backups->prune();

        $this->info(sprintf(
            'Backup #%d written: %s (%d tables, %d rows, %s)%s',
            $backup->getKey(), $backup->path, $backup->tables_count, $backup->rows_count, $backup->humanSize(),
            $pruned > 0 ? "; pruned {$pruned} expired backup(s)" : '',
        ));

        return self::SUCCESS;
    }
}
