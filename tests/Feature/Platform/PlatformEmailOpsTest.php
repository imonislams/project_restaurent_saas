<?php

namespace Tests\Feature\Platform;

use App\Domain\Communications\Models\EmailLog;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\PlatformSettings\MailConfigurator;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Mail\InvoiceIssuedMail;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PlatformEmailOpsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    public function test_outbound_email_is_recorded(): void
    {
        Mail::raw('Hello there', fn ($message) => $message->to('ops@example.com')->subject('Greetings'));

        $log = EmailLog::where('to_email', 'ops@example.com')->first();

        $this->assertNotNull($log);
        $this->assertSame('sent', $log->status);
        $this->assertSame('Greetings', $log->subject);
    }

    public function test_failed_invoice_email_can_be_retried(): void
    {
        Mail::fake();

        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);
        $invoice = app(SubscriptionService::class)->issueInvoice($subscription);

        $log = EmailLog::create([
            'tenant_id' => $tenant->id,
            'to_email' => 'billing@example.com',
            'subject' => 'Invoice '.$invoice->number,
            'status' => 'failed',
            'attempts' => 1,
            'error' => 'SMTP timeout',
            'retry_class' => InvoiceIssuedMail::class,
            'retry_payload' => ['invoice_id' => $invoice->id],
            'failed_at' => now(),
        ]);

        $this->actingAs($this->admin())->post("/platform/email/logs/{$log->id}/retry")->assertRedirect();

        Mail::assertQueued(InvoiceIssuedMail::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.email_retried']);
    }

    public function test_email_settings_password_is_encrypted_and_masked(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/email/settings', [
            'mailer' => 'smtp',
            'host' => 'smtp.example.com',
            'port' => 587,
            'username' => 'user',
            'encryption' => 'tls',
            'from_address' => 'no-reply@example.com',
            'from_name' => 'Platform',
            'password' => 'supersecret',
        ])->assertRedirect();

        $raw = DB::table('platform_settings')->where('key', 'mail.password')->value('value');
        $this->assertStringNotContainsString('supersecret', (string) $raw);

        $this->assertSame('supersecret', app(PlatformSettings::class)->get('mail.password'));
        $this->assertSame('smtp', app(PlatformSettings::class)->get('mail.mailer'));

        // The settings screen confirms a password exists without returning it.
        $this->actingAs($admin)->get('/platform/email/settings')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Email/Settings')->where('settings.has_password', true));
    }

    public function test_test_email_endpoint_reports_success(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/email/test', ['email' => 'check@example.com'])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('email_logs', ['to_email' => 'check@example.com', 'status' => 'sent']);
    }

    public function test_billing_admin_cannot_reach_email_operations(): void
    {
        $billing = User::factory()->platformAdmin()->create();
        $billing->assignRole(RoleName::BillingAdmin);

        $this->actingAs($billing)->get('/platform/email')->assertForbidden();
        $this->actingAs($billing)->get('/platform/email/settings')->assertForbidden();
    }

    public function test_placeholder_from_address_falls_back_to_the_smtp_mailbox(): void
    {
        $settings = app(PlatformSettings::class);
        $settings->set('mail.mailer', 'smtp', 'mail');
        $settings->set('mail.host', 'smtp.touchandsolve.com', 'mail');
        $settings->set('mail.username', 'hello@touchandsolve.com', 'mail');
        $settings->set('mail.from_address', 'hello@example.com', 'mail');

        app(MailConfigurator::class)->apply();

        // example.com is reserved (SPF -all, DMARC p=reject), so mail sent from it
        // is rejected by the receiving server: the provider mailbox must be used.
        $this->assertSame('hello@touchandsolve.com', config('mail.from.address'));
    }

    public function test_a_deliverable_from_address_is_kept(): void
    {
        $settings = app(PlatformSettings::class);
        $settings->set('mail.mailer', 'smtp', 'mail');
        $settings->set('mail.username', 'hello@touchandsolve.com', 'mail');
        $settings->set('mail.from_address', 'no-reply@touchandsolve.com', 'mail');

        app(MailConfigurator::class)->apply();

        $this->assertSame('no-reply@touchandsolve.com', config('mail.from.address'));
    }

    public function test_settings_screen_reports_the_sender_that_will_be_used(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/email/settings', [
            'mailer' => 'smtp',
            'host' => 'smtp.touchandsolve.com',
            'port' => 465,
            'username' => 'hello@touchandsolve.com',
            'encryption' => 'ssl',
            'from_address' => 'hello@example.com',
            'from_name' => 'Touch Dine',
        ])->assertRedirect();

        $this->actingAs($admin)->get('/platform/email/settings')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Email/Settings')
                ->where('settings.from_address', 'hello@touchandsolve.com'));
    }
}
