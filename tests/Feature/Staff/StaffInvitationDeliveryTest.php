<?php

namespace Tests\Feature\Staff;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Identity\Notifications\StaffInvitationNotification;
use App\Domain\PlatformSettings\MailConfigurator;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Mockery;
use RuntimeException;
use Tests\TestCase;

/**
 * The invitation email is the only channel a team member has, so its delivery
 * outcome must always be persisted, reported and never abort the request.
 */
class StaffInvitationDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function owner(Tenant $tenant): User
    {
        $user = User::factory()->forTenant($tenant)->create();
        $user->assignRole(RoleName::TenantOwner);

        return $user;
    }

    /** A configuration that can deliver, so only the send itself decides the outcome. */
    protected function deliverableMailConfig(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.from.address' => 'noreply@restaurant.test',
            'mail.mailers.smtp.username' => 'noreply@restaurant.test',
        ]);
    }

    protected function invite(Tenant $tenant, User $owner)
    {
        return $this->actingAs($owner)->post('/staff', [
            'name' => 'New Cashier',
            'email' => 'cashier@example.com',
            'roles' => [RoleName::Cashier->value],
            'branch_ids' => [],
        ]);
    }

    public function test_the_invitation_is_emailed_to_the_invitee(): void
    {
        Notification::fake();
        $this->deliverableMailConfig();

        $tenant = Tenant::factory()->create();

        $this->invite($tenant, $this->owner($tenant))
            ->assertRedirect()
            ->assertSessionHas('success', 'Invitation sent.');

        Notification::assertSentOnDemand(
            StaffInvitationNotification::class,
            fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'cashier@example.com',
        );
    }

    public function test_a_non_delivering_transport_is_reported_and_the_invitation_is_still_created(): void
    {
        Notification::fake();
        config(['mail.default' => 'log']);

        $tenant = Tenant::factory()->create();

        $this->invite($tenant, $this->owner($tenant))
            ->assertRedirect()
            ->assertSessionHas('error', fn ($message) => is_string($message) && str_contains($message, 'active transport is "log"'));

        $this->assertDatabaseHas('invitations', [
            'tenant_id' => $tenant->id,
            'email' => 'cashier@example.com',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.invited']);
    }

    public function test_a_transport_failure_does_not_abort_the_request(): void
    {
        $this->deliverableMailConfig();

        $mailer = Mockery::mock(Mailer::class);
        $mailer->shouldReceive('send')->andThrow(new RuntimeException('SMTP connection refused'));
        Mail::shouldReceive('mailer')->andReturn($mailer);

        $tenant = Tenant::factory()->create();

        $this->invite($tenant, $this->owner($tenant))
            ->assertRedirect()
            ->assertSessionHas('error', fn ($message) => is_string($message) && str_contains($message, 'SMTP connection refused'));

        $this->assertDatabaseHas('invitations', [
            'tenant_id' => $tenant->id,
            'email' => 'cashier@example.com',
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.invited']);
    }

    public function test_resend_rotates_the_token_and_reports_a_failed_send(): void
    {
        Notification::fake();
        config(['mail.default' => 'log']);

        $tenant = Tenant::factory()->create();
        $owner = $this->owner($tenant);
        $previous = Invitation::hashToken('previous-token');

        $invitation = Invitation::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'cashier@example.com',
            'roles' => [RoleName::Cashier->value],
            'token' => $previous,
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($owner)
            ->post("/staff/invitations/{$invitation->id}/resend")
            ->assertRedirect()
            ->assertSessionHas('error', fn ($message) => is_string($message) && str_contains($message, 'could not be sent'));

        $this->assertNotSame($previous, $invitation->fresh()->token);
        $this->assertDatabaseHas('audit_logs', ['action' => 'staff.invitation_resent']);
    }

    public function test_delivery_problem_reflects_the_effective_configuration(): void
    {
        $configurator = app(MailConfigurator::class);

        config(['mail.default' => 'log']);
        $this->assertStringContainsString('active transport is "log"', (string) $configurator->deliveryProblem());

        config([
            'mail.default' => 'smtp',
            'mail.from.address' => 'hello@example.com',
            'mail.mailers.smtp.username' => null,
        ]);
        $this->assertStringContainsString('From address cannot deliver', (string) $configurator->deliveryProblem());

        config(['mail.default' => 'smtp', 'mail.from.address' => 'noreply@restaurant.test']);
        $this->assertNull($configurator->deliveryProblem());
    }
}
