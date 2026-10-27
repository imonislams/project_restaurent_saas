<?php

namespace Tests\Feature\Platform;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Notifications\Notifications\SubscriptionPaymentFailedNotification;
use App\Domain\Notifications\Notifications\SubscriptionPaymentSucceededNotification;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ManualPaymentApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->owner = User::factory()->forTenant($this->tenant)->create();
        $this->owner->assignRole(RoleName::TenantOwner);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    /** A pending manual payment for this tenant's open invoice. */
    protected function pendingManualPayment(): PlatformPayment
    {
        $config = PaymentGateway::create([
            'name' => 'Manual',
            'provider' => 'manual',
            'environment' => 'production',
            'is_enabled' => true,
            'supported_currencies' => [],
        ]);

        $subscription = app(SubscriptionService::class)->startTrial($this->tenant);
        app(SubscriptionService::class)->activate($subscription);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription->fresh());

        $this->actingAs($this->admin())->post("/platform/invoices/{$invoice->id}/checkout", ['gateway_id' => $config->id]);

        return PlatformPayment::latest('id')->firstOrFail();
    }

    public function test_approving_a_manual_payment_settles_the_invoice_and_records_who_approved(): void
    {
        $admin = $this->admin();
        $payment = $this->pendingManualPayment();

        $this->assertSame(PlatformPaymentStatus::Pending, $payment->status);

        $this->actingAs($admin)->post("/platform/payments/{$payment->id}/approve", [
            'note' => 'Matched the bank statement.',
            'reference' => 'TRX-8H2K91',
        ])->assertRedirect()->assertSessionHas('success');

        $payment->refresh();

        $this->assertSame(PlatformPaymentStatus::Succeeded, $payment->status);
        $this->assertSame('settled', $payment->settlement_status);
        $this->assertSame($admin->getKey(), $payment->confirmed_by);
        $this->assertNotNull($payment->confirmed_at);
        $this->assertSame('Matched the bank statement.', $payment->confirmation_note);
        $this->assertSame('paid', $payment->invoice->fresh()->status->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.payment_approved']);
    }

    public function test_approving_tells_the_tenant_their_payment_was_received(): void
    {
        $payment = $this->pendingManualPayment();

        Notification::fake();

        $this->actingAs($this->admin())->post("/platform/payments/{$payment->id}/approve")->assertRedirect();

        Notification::assertSentTo($this->owner, SubscriptionPaymentSucceededNotification::class);
    }

    public function test_rejecting_a_manual_payment_keeps_the_invoice_open_and_records_the_reason(): void
    {
        $payment = $this->pendingManualPayment();
        $invoice = $payment->invoice;

        Notification::fake();

        $this->actingAs($this->admin())->post("/platform/payments/{$payment->id}/reject", [
            'reason' => 'No matching transfer found.',
        ])->assertRedirect()->assertSessionHas('success');

        $payment->refresh();

        $this->assertSame(PlatformPaymentStatus::Failed, $payment->status);
        $this->assertSame('rejected', $payment->settlement_status);
        $this->assertSame('No matching transfer found.', $payment->failure_reason);
        $this->assertSame('No matching transfer found.', $payment->confirmation_note);
        $this->assertNotSame('paid', $invoice->fresh()->status->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.payment_rejected']);

        Notification::assertSentTo($this->owner, SubscriptionPaymentFailedNotification::class);
    }

    public function test_a_rejection_reason_is_required(): void
    {
        $payment = $this->pendingManualPayment();

        $this->actingAs($this->admin())->post("/platform/payments/{$payment->id}/reject")
            ->assertSessionHasErrors('reason');

        $this->assertSame(PlatformPaymentStatus::Pending, $payment->fresh()->status);
    }

    public function test_only_a_pending_payment_can_be_confirmed_or_rejected(): void
    {
        $payment = $this->pendingManualPayment();

        $this->actingAs($this->admin())->post("/platform/payments/{$payment->id}/approve")->assertRedirect();

        $this->actingAs($this->admin())->post("/platform/payments/{$payment->id}/approve")
            ->assertSessionHasErrors('payment');
        $this->actingAs($this->admin())->post("/platform/payments/{$payment->id}/reject", ['reason' => 'Too late'])
            ->assertSessionHasErrors('payment');
    }

    public function test_a_public_callback_cannot_change_a_manual_payment(): void
    {
        $payment = $this->pendingManualPayment();

        $this->post('/payments/ipn/manual', [
            'tran_id' => $payment->provider_ref,
            'status' => 'FAILED',
        ])->assertOk()->assertJson(['processed' => false]);

        $this->assertSame(PlatformPaymentStatus::Pending, $payment->fresh()->status);
    }

    public function test_confirming_requires_the_payments_manage_permission(): void
    {
        $payment = $this->pendingManualPayment();

        $auditor = User::factory()->platformAdmin()->create();
        $auditor->assignRole(RoleName::PlatformAuditor);

        $this->actingAs($auditor)->post("/platform/payments/{$payment->id}/approve")->assertForbidden();
        $this->actingAs($auditor)->post("/platform/payments/{$payment->id}/reject", ['reason' => 'x'])->assertForbidden();

        $this->assertSame(PlatformPaymentStatus::Pending, $payment->fresh()->status);
    }
}
