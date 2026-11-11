<?php

namespace Tests\Feature\Documentation;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DocumentationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->tenant = Tenant::factory()->create();
        Branch::factory()->create(['tenant_id' => $this->tenant->id, 'code' => 'MAIN']);

        $this->user = User::factory()->forTenant($this->tenant)->create([
            'email_verified_at' => now(),
        ]);
        $this->user->assignRole(RoleName::TenantOwner);
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get('/docs')->assertRedirect('/login');
    }

    public function test_a_tenant_member_can_open_the_documentation_home(): void
    {
        $this->actingAs($this->user)
            ->get('/docs')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Documentation/Index'));
    }

    public function test_a_known_page_renders_with_its_slug(): void
    {
        $this->actingAs($this->user)
            ->get('/docs/orders')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Documentation/Show')
                ->where('page', 'orders'));
    }

    public function test_the_reference_pages_are_routable(): void
    {
        foreach (['journeys', 'button-reference', 'videos', 'role-guides', 'troubleshooting'] as $slug) {
            $this->actingAs($this->user)
                ->get('/docs/'.$slug)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->where('page', $slug));
        }
    }

    public function test_an_unknown_page_is_not_found(): void
    {
        $this->actingAs($this->user)
            ->get('/docs/not-a-real-page')
            ->assertNotFound();
    }
}
