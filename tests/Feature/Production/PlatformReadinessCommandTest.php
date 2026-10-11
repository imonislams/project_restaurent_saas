<?php

namespace Tests\Feature\Production;

use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformReadinessCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_readiness_command_reports_and_succeeds(): void
    {
        $this->artisan('platform:check')
            ->expectsOutputToContain('Platform readiness')
            ->assertSuccessful();
    }
}
