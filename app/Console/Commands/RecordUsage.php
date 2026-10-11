<?php

namespace App\Console\Commands;

use App\Jobs\RecordUsageSnapshot;
use Illuminate\Console\Command;

class RecordUsage extends Command
{
    protected $signature = 'usage:record';

    protected $description = 'Queue a usage snapshot for every tenant';

    public function handle(): int
    {
        RecordUsageSnapshot::dispatch();

        $this->info('Usage snapshot queued.');

        return self::SUCCESS;
    }
}
