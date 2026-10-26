<?php

namespace Tests\Feature\Install;

use App\Domain\Installer\EnvironmentWriter;
use App\Domain\Installer\InstallState;
use App\Domain\Installer\RequirementsChecker;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InstallerTest extends TestCase
{
    protected string $lockPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lockPath = sys_get_temp_dir().'/cc-install-'.uniqid().'.lock';

        $this->instance(InstallState::class, new InstallState($this->lockPath));

        // Requirement probes depend on the host; the wizard's gating is what we test.
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

    public function test_wizard_is_reachable_when_not_installed(): void
    {
        $this->get('/install')->assertRedirect(route('install.show', 'database'));

        $this->get('/install/database')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Install/Show')->where('step', 'database'));
    }

    public function test_wizard_is_blocked_once_installed(): void
    {
        file_put_contents($this->lockPath, '{}');

        $this->get('/install')->assertRedirect(route('login'));
        $this->get('/install/administrator')->assertRedirect(route('login'));
    }

    public function test_steps_cannot_be_skipped_ahead(): void
    {
        $this->get('/install/administrator')->assertRedirect(route('install.show', 'database'));
    }

    public function test_database_step_validates_input(): void
    {
        $this->post('/install/database', [
            'driver' => 'mysql',
            'host' => '',
            'port' => 3306,
            'database' => 'app',
            'username' => 'root',
        ])->assertSessionHasErrors('host');
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
}
