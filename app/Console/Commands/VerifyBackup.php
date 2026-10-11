<?php

namespace App\Console\Commands;

use App\Domain\BackupAndRecovery\BackupService;
use App\Domain\BackupAndRecovery\Models\Backup;
use Illuminate\Console\Command;

class VerifyBackup extends Command
{
    protected $signature = 'db:verify-backup {id?}';

    protected $description = 'Verify that a backup can be read back and contains the core tables';

    public function handle(BackupService $backups): int
    {
        $backup = $this->argument('id')
            ? Backup::query()->find($this->argument('id'))
            : Backup::query()->latest('id')->first();

        if (! $backup) {
            $this->error('No backup records found.');

            return self::FAILURE;
        }

        $result = $backups->verify($backup);

        if (! $result['ok']) {
            $this->error("Backup #{$backup->getKey()} verification FAILED — {$result['notes']}");

            return self::FAILURE;
        }

        $this->info("Backup #{$backup->getKey()} OK — {$result['notes']}");

        return self::SUCCESS;
    }
}
