<?php

namespace App\Console\Commands;

use App\Support\AppVersion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

/**
 * Post-build deploy steps: migrate, rebuild caches, restart workers, report the
 * version. Dependencies and the frontend build are handled by scripts/deploy.sh.
 */
class DeployCommand extends Command
{
    protected $signature = 'app:deploy
        {--no-migrate : Skip database migrations}
        {--no-down : Do not enter maintenance mode while migrating}';

    protected $description = 'Run the production deploy steps (migrate, cache, restart workers)';

    public function handle(AppVersion $version): int
    {
        $down = ! $this->option('no-down') && ! $this->option('no-migrate');

        if ($down) {
            $this->call('down', ['--retry' => 15, '--refresh' => 15]);
        }

        try {
            if (! $this->option('no-migrate')) {
                $this->call('migrate', ['--force' => true]);
            }

            $this->call('storage:link', ['--force' => true]);

            foreach (['config:cache', 'route:cache', 'view:cache', 'event:cache'] as $command) {
                $this->call($command);
            }

            $this->call('queue:restart');
        } finally {
            if ($down) {
                Artisan::call('up');
            }
        }

        $this->info('Deployed version '.$version->version().' ('.($version->commit() ?: 'unknown commit').')');
        $this->line('Verify: GET /health must report this version.');

        return self::SUCCESS;
    }
}
