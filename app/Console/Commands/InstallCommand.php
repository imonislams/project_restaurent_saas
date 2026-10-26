<?php

namespace App\Console\Commands;

use App\Domain\Installer\InstallerService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

/**
 * Headless installation: environment, schema, platform data and the first
 * administrator. Every prompt has a matching option, so it also runs unattended —
 * for example from a cPanel cron job on a host without SSH:
 *
 *   php artisan app:install --url=https://host \
 *     --db-database=user_db --db-username=user_db --db-password=secret \
 *     --admin-email=admin@host --admin-password=secret12345
 */
class InstallCommand extends Command
{
    protected $signature = 'app:install
        {--force : Install over a database that already contains tables}
        {--owner : Also create a first restaurant (tenant + owner)}
        {--app-name= : Application name}
        {--url= : Application URL}
        {--timezone= : Application timezone}
        {--db-driver=mysql : mysql, mariadb or pgsql}
        {--db-host=127.0.0.1 : Database host}
        {--db-port=3306 : Database port}
        {--db-database= : Database name}
        {--db-username= : Database username}
        {--db-password= : Database password}
        {--admin-name= : Administrator name}
        {--admin-email= : Administrator email}
        {--admin-password= : Administrator password (min 12 characters)}';

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

        try {
            $database = $this->database();
            $application = $this->application();
            $administrator = $this->administrator();
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

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

        $owner = ['create' => false];

        if ($this->option('owner')) {
            $owner = [
                'create' => true,
                'name' => $this->value('admin-name', 'Owner name', 'Restaurant Owner'),
                'email' => $this->value('admin-email', 'Owner email'),
                'password' => (string) ($this->option('admin-password') ?: $this->secret('Owner password (min 12 characters)')),
                'restaurant_name' => $this->value('app-name', 'Restaurant name', 'My Restaurant'),
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
        } catch (\Throwable $e) {
            // A migration or driver failure must show its reason, not just a trace.
            report($e);
            $this->error('Installation failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info('Installed v'.$result['version'].'. Administrator: '.$result['admin_email']);
        $this->line('Sign in at '.rtrim((string) $application['url'], '/').'/login');

        return self::SUCCESS;
    }

    /** @return array<string, mixed> */
    protected function database(): array
    {
        return [
            'driver' => $this->value('db-driver', 'Which database driver?', 'mysql'),
            'host' => $this->value('db-host', 'Database host', '127.0.0.1'),
            'port' => (int) $this->value('db-port', 'Database port', '3306'),
            'database' => $this->value('db-database', 'Database name'),
            'username' => $this->value('db-username', 'Database username'),
            'password' => $this->option('db-password') ?? (string) $this->secret('Database password (blank for none)'),
        ];
    }

    /** @return array<string, mixed> */
    protected function application(): array
    {
        return [
            'name' => $this->value('app-name', 'Application name', 'Touch Dine'),
            'url' => $this->value('url', 'Application URL', 'https://localhost'),
            'timezone' => $this->value('timezone', 'Timezone', (string) config('app.timezone', 'UTC')),
        ];
    }

    /** @return array<string, mixed> */
    protected function administrator(): array
    {
        $administrator = [
            'name' => $this->value('admin-name', 'Administrator name', 'Platform Admin'),
            'email' => $this->value('admin-email', 'Administrator email'),
            'password' => (string) ($this->option('admin-password') ?: $this->secret('Administrator password (min 12 characters)')),
        ];

        $validator = Validator::make($administrator, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', Password::min(12)->letters()->numbers()],
        ]);

        if ($validator->fails()) {
            throw new RuntimeException('Invalid administrator details: '.implode(' ', $validator->errors()->all()));
        }

        return $administrator;
    }

    /** An option value, falling back to a prompt for interactive runs. */
    protected function value(string $option, string $question, ?string $default = null): string
    {
        $value = $this->option($option);

        if (is_string($value) && $value !== '') {
            return $value;
        }

        if ($this->input->isInteractive()) {
            return (string) $this->ask($question, $default);
        }

        if ($default !== null) {
            return $default;
        }

        throw new RuntimeException("Missing required option --{$option} (running non-interactively).");
    }
}
