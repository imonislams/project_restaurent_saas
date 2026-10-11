<?php

namespace Tests\Feature\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'restaurant_name' => 'Test Restaurant',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('onboarding.index', absolute: false));
    }

    public function test_registration_provisions_a_tenant_and_owner_role(): void
    {
        $this->post('/register', [
            'name' => 'Test User',
            'restaurant_name' => 'Test Restaurant',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'test@example.com')->firstOrFail();

        $tenant = Tenant::findOrFail($user->tenant_id);

        $this->assertSame('Test Restaurant', $tenant->name);
        $this->assertSame(TenantStatus::Active, $tenant->status);
        $this->assertTrue($tenant->onTrial());
        $this->assertTrue($user->hasRole(RoleName::TenantOwner));
    }

    public function test_restaurant_name_is_required(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('restaurant_name');
        $this->assertGuest();
    }

    public function test_duplicate_email_is_rejected(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->post('/register', [
            'name' => 'Test User',
            'restaurant_name' => 'Test Restaurant',
            'email' => 'taken@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
