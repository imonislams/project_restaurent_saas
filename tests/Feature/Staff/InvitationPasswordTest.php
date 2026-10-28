<?php

namespace Tests\Feature\Staff;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Enums\InvitationVerification;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Identity\Notifications\StaffAccountCreatedNotification;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class InvitationPasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    /** @return array{0: Tenant, 1: User, 2: Branch} */
    protected function tenantWithOwner(): array
    {
        $tenant = Tenant::factory()->create();
        $branch = Branch::factory()->create(['tenant_id' => $tenant->id]);

        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);
        $owner->syncBranchAccess([$branch->getKey()]);

        return [$tenant, $owner, $branch];
    }

    protected function policy(Tenant $tenant, InvitationVerification $policy): void
    {
        $tenant->mergeSettings(['invitations.verification' => $policy->value]);
        $tenant->save();
    }

    public function test_owner_can_create_a_staff_account_with_a_password(): void
    {
        Notification::fake();

        [$tenant, $owner, $branch] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'branch_ids' => [$branch->getKey()],
            'password' => 'secret-pass-123',
        ])->assertRedirect();

        $user = User::where('email', 'nadia@example.com')->firstOrFail();

        $this->assertSame($tenant->id, $user->tenant_id);
        $this->assertSame('active', $user->status);
        $this->assertTrue(Hash::check('secret-pass-123', $user->password));
        $this->assertTrue($user->hasRole(RoleName::Cashier));
        $this->assertTrue($user->canAccessBranch($branch));

        // No invitation is issued: the account exists and is immediately usable.
        $this->assertDatabaseMissing('invitations', ['email' => 'nadia@example.com']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.created']);

        Notification::assertSentOnDemand(StaffAccountCreatedNotification::class);
    }

    public function test_the_owner_set_password_can_actually_sign_in(): void
    {
        Notification::fake();

        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'password' => 'secret-pass-123',
        ])->assertRedirect();

        $this->post('/logout');

        $this->post('/login', [
            'email' => 'nadia@example.com',
            'password' => 'secret-pass-123',
        ])->assertRedirect();

        $this->assertAuthenticatedAs(User::where('email', 'nadia@example.com')->firstOrFail());
    }

    public function test_a_password_requires_a_name(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/staff', [
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'password' => 'secret-pass-123',
        ])->assertSessionHasErrors('name');

        $this->assertDatabaseMissing('users', ['email' => 'nadia@example.com']);
    }

    public function test_a_short_password_is_rejected(): void
    {
        [$tenant, $owner] = $this->tenantWithOwner();

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'password' => 'abc',
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'nadia@example.com']);
    }

    public function test_the_password_is_never_written_to_the_audit_trail_or_the_email(): void
    {
        Notification::fake();

        [$tenant, $owner] = $this->tenantWithOwner();
        $password = 'secret-pass-123';

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'password' => $password,
        ])->assertRedirect();

        Notification::assertSentOnDemand(
            StaffAccountCreatedNotification::class,
            function (StaffAccountCreatedNotification $notification) use ($password) {
                $mail = $notification->toMail(new \stdClass);
                $body = implode(' ', $mail->introLines);

                return ! str_contains($body, $password) && ! str_contains($mail->subject, $password);
            },
        );

        foreach (AuditLog::all() as $log) {
            $this->assertStringNotContainsString($password, (string) json_encode($log->metadata));
        }
    }

    /**
     * @return array<string, array{0: InvitationVerification, 1: bool}>
     */
    public static function policyMatrix(): array
    {
        return [
            'link confirms' => [InvitationVerification::InviteLink, true],
            'must confirm by email' => [InvitationVerification::EmailLink, false],
            'no verification' => [InvitationVerification::None, true],
        ];
    }

    /**
     * @dataProvider policyMatrix
     */
    public function test_accepting_an_invitation_follows_the_tenant_policy(InvitationVerification $policy, bool $verified): void
    {
        Notification::fake();

        [$tenant] = $this->tenantWithOwner();
        $this->policy($tenant, $policy);

        $plain = 'policy-token-'.$policy->value;

        Invitation::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'invitee@example.com',
            'roles' => [RoleName::Cashier->value],
            'token' => Invitation::hashToken($plain),
        ]);

        $this->post("/invitations/{$plain}", [
            'name' => 'Invitee',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
        ])->assertRedirect(route('dashboard'));

        $user = User::where('email', 'invitee@example.com')->firstOrFail();

        $this->assertSame($verified, $user->email_verified_at !== null, 'email verification state');
        Notification::assertSentToTimes($user, VerifyEmail::class, $verified ? 0 : 1);
    }

    /**
     * @dataProvider policyMatrix
     */
    public function test_password_created_accounts_follow_the_tenant_policy(InvitationVerification $policy, bool $verified): void
    {
        Notification::fake();

        [$tenant, $owner] = $this->tenantWithOwner();
        $this->policy($tenant, $policy);

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'password' => 'secret-pass-123',
        ])->assertRedirect();

        $user = User::where('email', 'nadia@example.com')->firstOrFail();

        $this->assertSame($verified, $user->email_verified_at !== null, 'email verification state');
        Notification::assertSentToTimes($user, VerifyEmail::class, $verified ? 0 : 1);
    }

    public function test_a_password_created_account_without_verification_can_reach_the_dashboard(): void
    {
        Notification::fake();

        [$tenant, $owner, $branch] = $this->tenantWithOwner();
        $this->policy($tenant, InvitationVerification::None);

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'branch_ids' => [$branch->getKey()],
            'password' => 'secret-pass-123',
        ])->assertRedirect();

        $this->post('/logout');
        $this->post('/login', ['email' => 'nadia@example.com', 'password' => 'secret-pass-123']);

        $this->get('/dashboard')->assertOk();
    }

    public function test_a_password_created_account_that_must_verify_is_held_at_the_notice(): void
    {
        Notification::fake();

        [$tenant, $owner, $branch] = $this->tenantWithOwner();
        $this->policy($tenant, InvitationVerification::EmailLink);

        $this->actingAs($owner)->post('/staff', [
            'name' => 'Nadia Rahman',
            'email' => 'nadia@example.com',
            'roles' => [RoleName::Cashier->value],
            'branch_ids' => [$branch->getKey()],
            'password' => 'secret-pass-123',
        ])->assertRedirect();

        $this->post('/logout');
        $this->post('/login', ['email' => 'nadia@example.com', 'password' => 'secret-pass-123']);

        $this->get('/dashboard')->assertRedirect(route('verification.notice'));
        $this->get('/verify-email')->assertOk();
    }
}
