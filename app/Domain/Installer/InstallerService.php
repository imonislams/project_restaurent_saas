<?php

namespace App\Domain\Installer;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Operations\CommandRunner;
use App\Domain\Tenancy\Actions\RegisterTenant;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * First-time provisioning: environment, schema, platform data, the first
 * administrator, and the install lock. Shared by the setup wizard and the
 * `app:install` command.
 */
class InstallerService
{
    public function __construct(
        protected InstallState $state,
        protected EnvironmentWriter $env,
        protected RequirementsChecker $requirements,
    ) {}

    /** @return list<array<string, mixed>> */
    public function requirements(): array
    {
        return $this->requirements->checks();
    }

    public function requirementsMet(): bool
    {
        return $this->requirements->ok();
    }

    public function isInstalled(): bool
    {
        return $this->state->isInstalled();
    }

    /** @param array<string, mixed> $database @return array{ok: bool, message: string} */
    public function testDatabase(array $database): array
    {
        try {
            $this->applyDatabaseConfig($database);
            DB::connection()->select('select 1');

            return ['ok' => true, 'message' => 'Connection successful.'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => $e->getMessage()];
        }
    }

    /** @param array<string, mixed> $database */
    public function databaseHasTables(array $database): bool
    {
        try {
            $this->applyDatabaseConfig($database);

            return count(Schema::getTables()) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Run the full installation.
     *
     * @param  array{database: array<string, mixed>, application: array<string, mixed>, administrator: array<string, mixed>, owner?: array<string, mixed>|null, confirm_existing?: bool}  $payload
     * @return array<string, mixed>
     */
    public function install(array $payload): array
    {
        if ($this->state->isInstalled()) {
            throw new RuntimeException('The application is already installed.');
        }

        if (! $this->requirements->ok()) {
            throw new RuntimeException('Server requirements are not met.');
        }

        $database = $payload['database'];
        $application = $payload['application'];
        $administrator = $payload['administrator'];

        $connection = $this->testDatabase($database);

        if (! $connection['ok']) {
            throw new RuntimeException('Database connection failed: '.$connection['message']);
        }

        if ($this->databaseHasTables($database) && empty($payload['confirm_existing'])) {
            throw new RuntimeException('The target database already contains tables. Explicit confirmation is required.');
        }

        $this->applyDatabaseConfig($database);

        $this->env->set([
            'APP_NAME' => $application['name'] ?? 'Restaurant SaaS',
            'APP_ENV' => 'production',
            'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)),
            'APP_DEBUG' => 'false',
            'APP_URL' => rtrim((string) $application['url'], '/'),
            'APP_TIMEZONE' => $application['timezone'] ?? 'UTC',
            'APP_VERSION' => (string) config('version.version'),
            'DB_CONNECTION' => $database['driver'] ?? 'mysql',
            'DB_HOST' => $database['host'] ?? '127.0.0.1',
            'DB_PORT' => (string) ($database['port'] ?? 3306),
            'DB_DATABASE' => $database['database'] ?? '',
            'DB_USERNAME' => $database['username'] ?? '',
            'DB_PASSWORD' => $database['password'] ?? '',
            'SESSION_DRIVER' => 'database',
            'SESSION_SECURE_COOKIE' => str_starts_with((string) $application['url'], 'https://') ? 'true' : 'false',
            'CACHE_STORE' => 'database',
            'QUEUE_CONNECTION' => 'database',
        ]);

        Artisan::call('migrate', ['--force' => true]);

        $this->seedPlatformData();

        $admin = $this->createAdministrator($administrator);

        $owner = null;
        if (! empty($payload['owner']['create'])) {
            $owner = app(RegisterTenant::class)->execute([
                'name' => $payload['owner']['name'],
                'email' => $payload['owner']['email'],
                'password' => $payload['owner']['password'],
                'restaurant_name' => $payload['owner']['restaurant_name'],
            ]);
        }

        $this->state->lock([
            'admin_email' => $admin->email,
            'database' => $database['database'] ?? null,
        ]);

        // Run these in a fresh process so they read the .env we just wrote.
        $this->freshProcess(['storage:link', '--force']);
        $this->freshProcess(['config:cache']);
        $this->freshProcess(['route:cache']);
        $this->freshProcess(['view:cache']);
        $this->freshProcess(['queue:restart']);

        return [
            'version' => config('version.version'),
            'admin_email' => $admin->email,
            'owner_email' => $owner?->email,
        ];
    }

    protected function seedPlatformData(): void
    {
        foreach ([
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\PlanSeeder::class,
            \Database\Seeders\EmailTemplateSeeder::class,
        ] as $seeder) {
            Artisan::call('db:seed', ['--class' => $seeder, '--force' => true]);
        }
    }

    /** @param array<string, mixed> $administrator */
    protected function createAdministrator(array $administrator): User
    {
        $admin = User::create([
            'tenant_id' => null,
            'is_platform_admin' => true,
            'status' => 'active',
            'name' => $administrator['name'],
            'email' => $administrator['email'],
            'password' => $administrator['password'],
        ]);

        // Not mass-assignable by design; the first administrator is verified.
        $admin->forceFill(['email_verified_at' => now()])->save();

        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    /** @param array<string, mixed> $database */
    protected function applyDatabaseConfig(array $database): void
    {
        $driver = $database['driver'] ?? 'mysql';

        config([
            'database.default' => $driver,
            'database.connections.'.$driver => [
                'driver' => $driver,
                'host' => $database['host'] ?? '127.0.0.1',
                'port' => $database['port'] ?? 3306,
                'database' => $database['database'] ?? '',
                'username' => $database['username'] ?? '',
                'password' => $database['password'] ?? '',
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'strict' => true,
            ],
        ]);

        DB::purge($driver);
    }

    /** @param list<string> $arguments */
    protected function freshProcess(array $arguments): bool
    {
        try {
            $php = app(CommandRunner::class)->phpBinary();
            $command = escapeshellarg($php).' '.escapeshellarg(base_path('artisan'))
                .' '.implode(' ', array_map('escapeshellarg', $arguments));

            $process = Process::fromShellCommandline($command, base_path());
            $process->setTimeout(120);
            $process->run();

            return $process->isSuccessful();
        } catch (\Throwable $e) {
            return false;
        }
    }
}
