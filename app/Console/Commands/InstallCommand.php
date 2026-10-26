<?php

namespace App\Console\Commands;

use App\Domain\Installer\InstallerService;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * Headless equivalent of the setup wizard, for SSH/cPanel installs.
 */
class InstallCommand extends Command
{
    protected $signature = 'app:install
        {--force : Install over a database that already contains tables}
        {--owner : Also create a first restaurant (tenant + owner)}';

    protected $description = 'Install the application: environment, schema, platform data and the first administrator';

    public function handle(InstallerService $installer): int
    {
        if ($installer->isInstalled()) {
            $this->error('The application is already installed (storage/app/private/installed.lock).');

            return self::FAILURE;
        }

        if (! $installer->requirementsMet()) {
            $this->error('Server requirements are not met:');

            foreach ($installer->requirements() as $check) {
                if ($check['required'] && ! $check['ok']) {
                    $this->line('  x '.$check['label'].' - '.$check['detail']);
                }
            }

            return self::FAILURE;
        }

        $database = [
            'driver' => $this->choice('Database driver', ['mysql', 'mariadb', 'pgsql'], 'mysql'),
            'host' => (string) $this->ask('Database host', '127.0.0.1'),
            'port' => (int) $this->ask('Database port', '3306'),
            'database' => (string) $this->ask('Database name'),
            'username' => (string) $this->ask('Database username'),
            'password' => (string) $this->secret('Database password (blank for none)'),
        ];

        $connection = $installer->testDatabase($database);

        if (! $connection['ok']) {
            $this->error('Could not connect: '.$connection['message']);

            return self::FAILURE;
        }

        $confirmExisting = false;

        if ($installer->databaseHasTables($database)) {
            if (! $this->option('force')) {
                $this->error('The database already contains tables. Re-run with --force to install over it.');

                return self::FAILURE;
            }

            $confirmExisting = true;
        }

        $application = [
            'name' => (string) $this->ask('Application name', 'Touch Dine'),
            'url' => (string) $this->ask('Application URL', 'https://localhost'),
            'timezone' => (string) $this->ask('Timezone', (string) config('app.timezone', 'UTC')),
        ];

        $administrator = [
            'name' => (string) $this->ask('Administrator name', 'Platform Admin'),
            'email' => (string) $this->ask('Administrator email'),
            'password' => (string) $this->secret('Administrator password (min 12 characters)'),
        ];

        $owner = ['create' => false];

        if ($this->option('owner')) {
            $owner = [
                'create' => true,
                'name' => (string) $this->ask('Owner name'),
                'email' => (string) $this->ask('Owner email'),
                'password' => (string) $this->secret('Owner password (min 12 characters)'),
                'restaurant_name' => (string) $this->ask('Restaurant name'),
            ];
        }

        try {
            $result = $installer->install([
                'database' => $database,
                'application' => $application,
                'administrator' => $administrator,
                'owner' => $owner,
                'confirm_existing' => $confirmExisting,
            ]);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Installed v'.$result['version'].'. Administrator: '.$result['admin_email']);
        $this->line('Sign in at '.rtrim($application['url'], '/').'/login');

        return self::SUCCESS;
    }
}
