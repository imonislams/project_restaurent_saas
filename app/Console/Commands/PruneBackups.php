<?php

namespace App\Console\Commands;

use App\Domain\BackupAndRecovery\BackupService;
use Illuminate\Console\Command;

class PruneBackups extends Command
{
    protected $signature = 'backups:prune';

    protected $description = 'Delete backups past their retention date';

    public function handle(BackupService $backups): int
    {
        $count = $backups->prune();

        $this->info("Pruned {$count} expired backup(s).");

        return self::SUCCESS;
    }
}
