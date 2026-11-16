<?php

namespace Tests\Feature\Readiness;

use App\Support\HealthChecker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * QA-E-03 regression cover.
 *
 * The buffer pool itself only exists on MySQL/MariaDB, so the numerical branch
 * cannot run on the SQLite test connection. What is testable — and what would
 * actually break something — is that the check never turns the liveness probe
 * red, and that it degrades cleanly on a driver where the variable means nothing.
 */
class DatabaseCapacityCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_check_does_not_fail_health_on_a_non_mysql_driver(): void
    {
        $capacity = app(HealthChecker::class)->databaseCapacity();

        $this->assertFalse($capacity['applicable'], 'SQLite has no InnoDB buffer pool');
        $this->assertTrue($capacity['ok'], 'a capacity setting must never fail liveness');
    }

    public function test_the_health_endpoint_stays_green_with_the_capacity_check_present(): void
    {
        config(['app.health_disclose_detail' => true]);

        $response = $this->get('/health');

        $response->assertOk()->assertJsonPath('status', 'ok');
        $this->assertArrayHasKey('database_capacity', $response->json('checks'));
        $this->assertTrue($response->json('checks.database_capacity.ok'));
    }

    public function test_the_minimum_pool_size_is_configurable(): void
    {
        $this->assertSame(128, config('platform.database.min_buffer_pool_mb'));

        config(['platform.database.min_buffer_pool_mb' => 512]);

        $this->assertSame(512, config('platform.database.min_buffer_pool_mb'));
    }

    public function test_platform_check_succeeds_when_capacity_cannot_be_assessed(): void
    {
        // On SQLite the capacity check reports "not applicable", which must not
        // fail the readiness command — otherwise CI on SQLite could never pass.
        $this->artisan('platform:check')
            ->expectsOutputToContain('InnoDB pool')
            ->assertSuccessful();
    }
}
