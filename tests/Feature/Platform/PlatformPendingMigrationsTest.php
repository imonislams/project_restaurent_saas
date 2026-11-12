<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Operations\Models\CommandRun;
use App\Domain\Operations\ProcessRunner;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlatformPendingMigrationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function admin(RoleName $role = RoleName::SaasSuperAdmin): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole($role);

        return $admin;
    }

    /**
     * Unmark the newest migrations so they become pending without touching the
     * schema that RefreshDatabase already built.
     *
     * @return list<string> migration names in execution (filename) order
     */
    protected function makePending(int $count = 1): array
    {
        $rows = DB::table('migrations')->orderByDesc('id')->limit($count)->get();

        $this->assertCount($count, $rows, 'Not enough executed migrations to unmark.');

        foreach ($rows as $row) {
            DB::table('migrations')->where('id', $row->id)->delete();
        }

        return $rows->pluck('migration')->reverse()->values()->all();
    }

    /** Replace the process layer so no real Artisan command runs. */
    protected function fakeProcesses(array $responses = []): ProcessRunner
    {
        $fake = new class($responses) extends ProcessRunner
        {
            /** @var list<list<string>> */
            public array $calls = [];

            /** @param array<string, array{exit_code: int, output: string}> $responses */
            public function __construct(protected array $responses = []) {}

            public function run(array $command, int $timeout = 600, ?string $cwd = null): array
            {
                $this->calls[] = $command;
                $joined = implode(' ', $command);

                foreach ($this->responses as $needle => $response) {
                    if (str_contains($joined, $needle)) {
                        return $response;
                    }
                }

                return ['exit_code' => 0, 'output' => 'ok'];
            }
        };

        $this->app->instance(ProcessRunner::class, $fake);

        return $fake;
    }

    public function test_the_command_page_lists_pending_and_executed_migrations(): void
    {
        $admin = $this->admin();
        $pending = $this->makePending();

        $this->actingAs($admin)->get('/platform/commands')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Ops/Commands')
                ->where('migrations.readable', true)
                ->where('migrations.pending.0.name', $pending[0])
                ->where('migrations.pending.0.status', 'pending')
                ->has('migrations.executed')
                ->has('migrations.last_backup'));
    }

    public function test_only_pending_migrations_can_be_run(): void
    {
        $admin = $this->admin();
        $executed = (string) DB::table('migrations')->orderBy('id')->value('migration');
        $fake = $this->fakeProcesses();

        $this->actingAs($admin)->post('/platform/commands/migrations', [
            'migrations' => [$executed],
            'backup' => false,
        ])->assertSessionHasErrors('migrations');

        $this->assertDatabaseCount('command_runs', 0);
        $this->assertSame([], $fake->calls);
    }

    public function test_an_empty_selection_is_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/commands/migrations', [
            'migrations' => [],
            'backup' => false,
        ])->assertSessionHasErrors('migrations');

        $this->assertDatabaseCount('command_runs', 0);
    }

    public function test_a_locked_run_is_rejected(): void
    {
        $admin = $this->admin();
        $pending = $this->makePending();

        $lock = Cache::lock('platform:migrations:run', 60);
        $this->assertTrue($lock->get());

        try {
            $this->actingAs($admin)->post('/platform/commands/migrations', [
                'migrations' => $pending,
                'backup' => false,
            ])->assertSessionHasErrors('migrations');
        } finally {
            $lock->release();
        }

        $this->assertDatabaseCount('command_runs', 0);
    }

    public function test_selected_migrations_run_in_selected_order_and_are_audited(): void
    {
        $admin = $this->admin();
        $pending = $this->makePending(2);
        $fake = $this->fakeProcesses();

        $this->actingAs($admin)->post('/platform/commands/migrations', [
            'migrations' => array_reverse($pending), // deliberately out of order
            'backup' => false,
        ])->assertRedirect()->assertSessionHas('success');

        $run = CommandRun::query()->where('type', 'migration')->firstOrFail();
        $this->assertSame('completed', $run->status);
        $this->assertLessThanOrEqual(255, mb_strlen($run->command));
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.migrations_run']);

        $this->assertCount(1, $fake->calls);

        $command = $fake->calls[0];
        $paths = array_values(array_filter($command, fn ($argument) => str_starts_with($argument, '--path=')));

        $this->assertContains('migrate', $command);
        $this->assertContains('--force', $command);
        $this->assertSame([
            '--path=database/migrations/'.$pending[0].'.php',
            '--path=database/migrations/'.$pending[1].'.php',
        ], $paths);
    }

    public function test_backup_runs_before_the_migration(): void
    {
        $admin = $this->admin();
        $pending = $this->makePending();
        $fake = $this->fakeProcesses();

        $this->actingAs($admin)->post('/platform/commands/migrations', [
            'migrations' => $pending,
            'backup' => true,
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertCount(2, $fake->calls);
        $this->assertContains('db:backup', $fake->calls[0]);
        $this->assertContains('migrate', $fake->calls[1]);
    }

    public function test_a_failed_backup_aborts_the_migration_run(): void
    {
        $admin = $this->admin();
        $pending = $this->makePending();
        $fake = $this->fakeProcesses([
            'db:backup' => ['exit_code' => 1, 'output' => 'disk full'],
        ]);

        $this->actingAs($admin)->post('/platform/commands/migrations', [
            'migrations' => $pending,
            'backup' => true,
        ])->assertRedirect()->assertSessionHas('error', fn ($message) => is_string($message) && str_contains($message, 'backup failed'));

        $run = CommandRun::query()->where('type', 'migration')->firstOrFail();
        $this->assertSame('failed', $run->status);
        $this->assertStringContainsString('disk full', (string) $run->output);

        $this->assertCount(1, $fake->calls);
        $this->assertContains('db:backup', $fake->calls[0]);
    }

    public function test_the_migration_runner_requires_the_commands_run_permission(): void
    {
        $billingAdmin = $this->admin(RoleName::BillingAdmin);

        $this->actingAs($billingAdmin)->get('/platform/commands')->assertForbidden();
        $this->actingAs($billingAdmin)->post('/platform/commands/migrations', [
            'migrations' => ['2026_11_11_000003_add_tax_flags_to_orders_table'],
            'backup' => false,
        ])->assertForbidden();

        $this->assertDatabaseCount('command_runs', 0);
    }
}
