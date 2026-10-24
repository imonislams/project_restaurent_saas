<?php

namespace Tests\Feature\Readiness;

use App\Support\AppVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppVersionTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_version_file_is_the_single_source_of_truth(): void
    {
        $expected = trim((string) file_get_contents(base_path('VERSION')));

        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', $expected);
        $this->assertSame($expected, app(AppVersion::class)->version());
    }

    public function test_a_configured_version_overrides_the_file(): void
    {
        config(['version.version' => '9.9.9']);

        $this->assertSame('9.9.9', app(AppVersion::class)->version());
    }

    public function test_an_explicit_commit_is_preferred_over_detection(): void
    {
        config(['version.commit' => 'deadbee']);

        $this->assertSame('deadbee', app(AppVersion::class)->commit());
    }

    public function test_the_health_endpoint_reports_the_version(): void
    {
        config(['version.version' => '1.2.3', 'version.commit' => 'abc1234']);

        $this->get('/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('version', '1.2.3')
            ->assertJsonPath('commit', 'abc1234');
    }

    public function test_the_version_is_shared_with_the_frontend(): void
    {
        config(['version.version' => '1.2.3', 'version.commit' => 'abc1234']);

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('version.app', '1.2.3')
                ->where('version.commit', 'abc1234'));
    }

    public function test_the_version_command_reports_the_version(): void
    {
        $this->artisan('app:version')
            ->assertSuccessful()
            ->expectsOutputToContain('Version:');
    }

    public function test_the_bump_command_advances_the_version(): void
    {
        $path = base_path('VERSION');
        $original = (string) file_get_contents($path);

        try {
            file_put_contents($path, "1.2.3\n");

            $this->artisan('version:bump', ['part' => 'patch'])->assertSuccessful();
            $this->assertSame('1.2.4', trim((string) file_get_contents($path)));

            $this->artisan('version:bump', ['part' => 'minor'])->assertSuccessful();
            $this->assertSame('1.3.0', trim((string) file_get_contents($path)));

            $this->artisan('version:bump', ['part' => 'major'])->assertSuccessful();
            $this->assertSame('2.0.0', trim((string) file_get_contents($path)));
        } finally {
            file_put_contents($path, $original);
        }
    }

    public function test_the_bump_command_rejects_an_unknown_part(): void
    {
        $this->artisan('version:bump', ['part' => 'banana'])->assertExitCode(1);
    }
}
