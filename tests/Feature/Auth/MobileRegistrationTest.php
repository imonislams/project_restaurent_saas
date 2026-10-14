<?php

namespace Tests\Feature\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\PhoneVerificationCode;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobileRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_new_users_can_register_with_a_mobile_number(): void
    {
        $response = $this->post('/register', [
            'identifier_type' => 'phone',
            'name' => 'Mobile Owner',
            'restaurant_name' => 'Dhaka Kitchen',
            'phone' => '+8801712345678',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('verification.phone', absolute: false));
        $response->assertSessionHasNoErrors();

        $user = User::where('phone', '+8801712345678')->firstOrFail();

        $this->assertNull($user->email);
        $this->assertTrue($user->hasRole(RoleName::TenantOwner));
        $this->assertNotNull(Tenant::find($user->tenant_id));
        $this->assertFalse($user->hasVerifiedEmail());
        $this->assertSame(1, PhoneVerificationCode::where('user_id', $user->getKey())->count());
    }

    public function test_email_registration_does_not_issue_an_otp(): void
    {
        $this->post('/register', [
            'identifier_type' => 'email',
            'name' => 'Email Owner',
            'restaurant_name' => 'Email Kitchen',
            'email' => 'email-owner@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'email-owner@example.com')->firstOrFail();

        $this->assertSame(0, PhoneVerificationCode::where('user_id', $user->getKey())->count());
    }

    public function test_duplicate_mobile_number_is_rejected(): void
    {
        User::factory()->create(['phone' => '+8801712345678']);

        $response = $this->post('/register', [
            'identifier_type' => 'phone',
            'name' => 'Mobile Owner',
            'restaurant_name' => 'Dhaka Kitchen',
            'phone' => '+8801712345678',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('phone');
        $this->assertGuest();
    }

    public function test_mobile_number_is_normalised(): void
    {
        $this->post('/register', [
            'identifier_type' => 'phone',
            'name' => 'Mobile Owner',
            'restaurant_name' => 'Dhaka Kitchen',
            'phone' => '8801 712-345 678',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertDatabaseHas('users', ['phone' => '+8801712345678']);
    }

    public function test_identifier_type_is_required(): void
    {
        $response = $this->post('/register', [
            'name' => 'Owner',
            'restaurant_name' => 'Kitchen',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('identifier_type');
        $this->assertGuest();
    }
}
