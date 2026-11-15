<?php

namespace Tests\Feature\Platform;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QaPortalAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Roles are rows, not constants: without the seeder assignRole() throws
        // "Role [saas_super_admin] is not defined".
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_guests_cannot_read_the_qa_portal(): void
    {
        $this->get('/platform/ops/qa-portal')->assertRedirect('/login');
    }

    public function test_tenant_users_cannot_read_the_qa_portal(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);

        $this->actingAs($user)
            ->get('/platform/ops/qa-portal')
            ->assertForbidden();
    }

    public function test_platform_admin_can_read_the_qa_portal(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        $response = $this->actingAs($admin)->get('/platform/ops/qa-portal');

        $response->assertOk();
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        // The global AddSecurityHeaders middleware owns framing policy; assert
        // only that a restrictive value is present, not which layer set it.
        $this->assertContains(
            $response->headers->get('X-Frame-Options'),
            ['DENY', 'SAMEORIGIN'],
        );
    }
}
