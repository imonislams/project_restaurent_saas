<?php

namespace App\Console\Commands;

use App\Support\AppVersion;
use Illuminate\Console\Command;

class AppVersionCommand extends Command
{
    protected $signature = 'app:version';

    protected $description = 'Show the application version and build commit';

    public function handle(AppVersion $version): int
    {
        $commit = $version->commit();

        $this->line('Version: '.$version->version());
        $this->line('Commit:  '.($commit !== '' ? $commit : '(unknown)'));

        return self::SUCCESS;
    }
}
