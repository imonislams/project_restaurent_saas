<?php

namespace Tests\Feature\Install;

use App\Domain\Installer\EnvironmentWriter;
use App\Domain\Installer\InstallerService;
use App\Domain\Installer\InstallState;
use App\Domain\Installer\RequirementsChecker;
use App\Models\User;
use Tests\TestCase;

class InstallerTest extends TestCase
{
    protected string $lockPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lockPath = sys_get_temp_dir().'/cc-install-'.uniqid().'.lock';

        $this->instance(InstallState::class, new InstallState($this->lockPath));

        // Requirement probes depend on the host; the install itself is what we test.
        $this->instance(RequirementsChecker::class, new class extends RequirementsChecker
        {
            public function checks(): array
            {
                return [['key' => 'php_version', 'label' => 'PHP', 'ok' => true, 'detail' => 'ok', 'required' => true]];
            }

            public function ok(): bool
            {
                return true;
            }
        });
    }

    protected function tearDown(): void
    {
        @unlink($this->lockPath);

        parent::tearDown();
    }

    public function test_install_command_refuses_when_already_installed(): void
    {
        file_put_contents($this->lockPath, '{}');

        $this->artisan('app:install')->assertExitCode(1);
    }

    public function test_install_state_locks_and_unlocks(): void
    {
        $state = new InstallState($this->lockPath);

        $this->assertFalse($state->isInstalled());

        $state->lock(['admin_email' => 'admin@example.test']);

        $this->assertTrue($state->isInstalled());
        $this->assertSame('admin@example.test', $state->details()['admin_email']);

        $state->unlock();

        $this->assertFalse($state->isInstalled());
    }

    public function test_environment_writer_merges_without_dropping_keys(): void
    {
        $path = sys_get_temp_dir().'/cc-env-'.uniqid();
        file_put_contents($path, "APP_NAME=Old\nEXISTING=keep\n");

        (new EnvironmentWriter($path))->set([
            'APP_NAME' => 'New App',
            'NEW_KEY' => 'a b',
        ]);

        $contents = (string) file_get_contents($path);

        $this->assertStringContainsString('APP_NAME="New App"', $contents);
        $this->assertStringContainsString('EXISTING=keep', $contents);
        $this->assertStringContainsString('NEW_KEY="a b"', $contents);

        @unlink($path);
    }

    public function test_the_full_installation_runs_end_to_end(): void
    {
        $environment = sys_get_temp_dir().'/cc-env-'.uniqid();
        file_put_contents($environment, "APP_NAME=Old\n");

        $state = new InstallState($this->lockPath);

        // Real install, minus the external `artisan` subprocesses (which would touch
        // this repository's own storage/ and bootstrap/cache).
        $installer = new class($state, new EnvironmentWriter($environment), app(RequirementsChecker::class)) extends InstallerService
        {
            protected function freshProcess(array $arguments): bool
            {
                return true;
            }
        };

        $result = $installer->install([
            'database' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'host' => '',
                'port' => 0,
                'username' => '',
                'password' => '',
            ],
            'application' => [
                'name' => 'Touch Dine',
                'url' => 'https://example.test',
                'timezone' => 'UTC',
            ],
            'administrator' => [
                'name' => 'Platform Admin',
                'email' => 'admin@example.test',
                'password' => 'correct-horse-1',
            ],
        ]);

        $this->assertSame('admin@example.test', $result['admin_email']);
        $this->assertTrue($state->isInstalled());

        // Schema + platform data + the administrator.
        $this->assertDatabaseHas('users', ['email' => 'admin@example.test', 'is_platform_admin' => true]);
        $this->assertDatabaseCount('roles', 17);
        $this->assertTrue(User::query()->where('email', 'admin@example.test')->first()->isPlatformAdmin());

        // .env written with a fresh key.
        $written = (string) file_get_contents($environment);
        $this->assertStringContainsString('APP_KEY=base64:', $written);
        $this->assertStringContainsString('APP_ENV=production', $written);
        $this->assertStringContainsString('APP_DEBUG=false', $written);

        @unlink($environment);
    }
}
