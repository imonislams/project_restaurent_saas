<?php

namespace Tests\Feature\Auth;

use App\Domain\Identity\Models\PhoneVerificationCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PhoneVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function phoneUser(array $attributes = []): User
    {
        return User::factory()->forTenant()->create(array_merge([
            'email' => null,
            'phone' => '+8801712345678',
            'email_verified_at' => null,
            'phone_verified_at' => null,
        ], $attributes));
    }

    protected function issueCode(User $user, string $code = '123456', ?string $expiresAt = null): PhoneVerificationCode
    {
        return $user->phoneVerificationCodes()->create([
            'phone' => $user->phone,
            'code_hash' => Hash::make($code),
            'purpose' => 'phone_verification',
            'expires_at' => $expiresAt ? now()->parse($expiresAt) : now()->addMinutes(10),
        ]);
    }

    public function test_notice_renders_the_phone_screen_for_mobile_accounts(): void
    {
        $user = $this->phoneUser();

        $this->actingAs($user)
            ->get(route('verification.notice'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/VerifyPhone')
                ->where('phone', fn ($phone) => str_ends_with($phone, '5678')));
    }

    public function test_a_valid_code_verifies_the_phone(): void
    {
        $user = $this->phoneUser();
        $this->issueCode($user, '123456');

        $this->actingAs($user)
            ->post(route('verification.phone.verify'), ['code' => '123456'])
            ->assertRedirect(route('onboarding.index', absolute: false));

        $this->assertNotNull($user->fresh()->phone_verified_at);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_an_incorrect_code_is_rejected_and_counts_an_attempt(): void
    {
        $user = $this->phoneUser();
        $record = $this->issueCode($user, '123456');

        $this->actingAs($user)
            ->post(route('verification.phone.verify'), ['code' => '000000'])
            ->assertSessionHas('error');

        $this->assertNull($user->fresh()->phone_verified_at);
        $this->assertSame(1, $record->fresh()->attempts);
    }

    public function test_an_expired_code_is_rejected(): void
    {
        $user = $this->phoneUser();
        $this->issueCode($user, '123456', expiresAt: '-5 minutes');

        $this->actingAs($user)
            ->post(route('verification.phone.verify'), ['code' => '123456'])
            ->assertSessionHas('error');

        $this->assertNull($user->fresh()->phone_verified_at);
    }

    public function test_a_verified_phone_cannot_be_reused(): void
    {
        $user = $this->phoneUser();
        $record = $this->issueCode($user, '123456');

        $this->actingAs($user)->post(route('verification.phone.verify'), ['code' => '123456']);
        $this->actingAs($user)->post(route('verification.phone.verify'), ['code' => '123456']);

        // The code is consumed once.
        $this->assertNotNull($record->fresh()->consumed_at);
    }

    public function test_resend_issues_a_new_code(): void
    {
        $user = $this->phoneUser();

        $this->actingAs($user)
            ->post(route('verification.phone.resend'))
            ->assertSessionHas('status');

        $this->assertSame(1, PhoneVerificationCode::where('user_id', $user->getKey())->count());
    }

    public function test_an_unverified_mobile_user_is_blocked_from_the_dashboard(): void
    {
        $user = $this->phoneUser();

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect(route('verification.notice'));
    }

    public function test_a_verified_mobile_user_can_reach_the_dashboard(): void
    {
        $user = $this->phoneUser(['phone_verified_at' => now()]);

        $this->actingAs($user)->get('/dashboard')->assertOk();
    }
}
