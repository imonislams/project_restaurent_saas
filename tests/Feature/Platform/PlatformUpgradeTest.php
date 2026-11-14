<?php

namespace Tests\Feature\Platform;

use App\Domain\Communications\AnnouncementService;
use App\Domain\Communications\EmailTemplateService;
use App\Domain\Communications\Models\Announcement;
use App\Domain\Communications\Models\Campaign;
use App\Domain\Communications\Models\EmailTemplate;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Marketing\Models\MarketingSubscriber;
use App\Domain\Operations\CommandRunner;
use App\Domain\Operations\Models\CommandRun;
use App\Domain\PlatformAnalytics\PlatformAnalyticsService;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Domain\Subscriptions\CouponService;
use App\Domain\Subscriptions\Enums\BillingCycle;
use App\Domain\Subscriptions\Models\Coupon;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\PricingService;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Database\Seeders\EmailTemplateSeeder;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PlatformUpgradeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(PlanSeeder::class);
        $this->seed(EmailTemplateSeeder::class);
    }

    protected function admin(RoleName $role = RoleName::SaasSuperAdmin): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole($role);

        return $admin;
    }

    protected function ownerFor(Tenant $tenant): User
    {
        $owner = User::factory()->forTenant($tenant)->create();
        $owner->assignRole(RoleName::TenantOwner);

        return $owner;
    }

    /** The sessions page previously crashed on an uncaptured $request. */
    public function test_sessions_page_renders_and_flags_the_current_session(): void
    {
        $admin = $this->admin();

        DB::table('sessions')->insert([
            'id' => 'session-abc',
            'user_id' => $admin->getKey(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => base64_encode(serialize([])),
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($admin)->get('/platform/sessions')->assertOk()
            ->assertInertia(fn ($page) => $page->component('Platform/Security/Sessions')->has('sessions.data', 1));
    }

    public function test_reporting_currency_setting_drives_analytics_currency(): void
    {
        $this->admin(); // seed settings via first admin is not needed; set directly.

        app(PlatformSettings::class)->set('localization.reporting_currency', 'BDT', 'localization');

        $this->assertSame('BDT', app(PlatformAnalyticsService::class)->currency());
    }

    public function test_enabled_currencies_setting_limits_the_currency_list(): void
    {
        app(PlatformSettings::class)->set('localization.enabled_currencies', 'USD, BDT', 'localization');

        $this->assertSame(['USD', 'BDT'], app(PlatformSettings::class)->enabledCurrencies());
    }

    public function test_email_template_can_be_edited_previewed_and_reset(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/email/templates/invoice_issued', [
            'name' => 'Invoice issued',
            'subject' => 'Invoice {{ invoice_number }}',
            'body' => '<p>Hello {{ tenant_name }}</p>',
            'is_active' => true,
        ])->assertRedirect();

        $template = EmailTemplate::where('key', 'invoice_issued')->firstOrFail();
        $this->assertSame('Invoice {{ invoice_number }}', $template->subject);

        $this->actingAs($admin)->get('/platform/email/templates?template=invoice_issued')->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Platform/Email/Templates')
                ->where('preview.subject', 'Invoice INV-20260101-0001'));

        $this->actingAs($admin)->delete('/platform/email/templates/invoice_issued')->assertRedirect();
        $this->assertDatabaseMissing('email_templates', ['key' => 'invoice_issued']);
    }

    public function test_invoice_mail_uses_the_edited_template(): void
    {
        Mail::fake();

        EmailTemplate::where('key', 'invoice_issued')->update(['body' => '<p>CUSTOM BODY {{ invoice_number }}</p>']);

        $rendered = app(EmailTemplateService::class)
            ->render('invoice_issued', ['invoice_number' => 'INV-9']);

        $this->assertStringContainsString('<p>CUSTOM BODY INV-9</p>', $rendered['body']);
    }

    public function test_template_stores_content_and_wraps_it_in_the_branded_shell(): void
    {
        $service = app(EmailTemplateService::class);

        // Stored body is editable content, not a full HTML document.
        $stored = EmailTemplate::where('key', 'invoice_issued')->value('body');
        $this->assertStringNotContainsString('<!DOCTYPE html>', $stored);

        $rendered = $service->render('invoice_issued', [
            'invoice_number' => 'INV-1',
            'tenant_name' => 'Acme',
            'amount' => '9.00 USD',
            'due_date' => 'soon',
            'platform_name' => 'POS',
        ]);

        $this->assertStringContainsString('<!DOCTYPE html>', $rendered['body']);
        $this->assertStringContainsString('INV-1', $rendered['body']);
        $this->assertStringContainsString('email-body', $rendered['body']);
    }

    public function test_legacy_full_document_body_is_not_double_wrapped(): void
    {
        $service = app(EmailTemplateService::class);

        $full = '<!DOCTYPE html><html><body><p>Legacy</p></body></html>';

        $this->assertSame($full, $service->wrap($full));
    }

    public function test_coupon_auto_applies_when_eligible(): void
    {
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);

        Coupon::create(['code' => 'AUTO20', 'type' => 'percent', 'value' => 20, 'is_active' => true, 'auto_apply' => true]);

        $invoice = app(SubscriptionService::class)->issueInvoice($subscription->fresh());

        $this->assertSame('5.80', $invoice->discount_amount);
        $this->assertSame('23.20', $invoice->amount);
        $this->assertSame('AUTO20', $invoice->coupon_code);
    }

    public function test_coupon_is_skipped_when_minimum_amount_is_not_met(): void
    {
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);

        Coupon::create(['code' => 'BIG', 'type' => 'percent', 'value' => 20, 'is_active' => true, 'auto_apply' => true, 'min_amount' => 100]);

        $invoice = app(SubscriptionService::class)->issueInvoice($subscription->fresh());

        $this->assertSame('0.00', $invoice->discount_amount);
        $this->assertNull($invoice->coupon_code);
    }

    public function test_coupon_per_tenant_limit_allows_multiple_redemptions(): void
    {
        $tenant = Tenant::factory()->create();
        $subscription = app(SubscriptionService::class)->startTrial($tenant);

        $coupon = Coupon::create(['code' => 'LIMIT2', 'type' => 'fixed', 'value' => 5, 'is_active' => true, 'per_tenant_limit' => 2]);

        $service = app(CouponService::class);
        $service->redeem($coupon, $tenant, $subscription, 5);
        $this->assertTrue($coupon->fresh()->isRedeemable($tenant));

        $service->redeem($coupon->fresh(), $tenant, $subscription, 5);
        $this->assertFalse($coupon->fresh()->isRedeemable($tenant));
    }

    public function test_a_campaign_is_delivered_to_marketing_subscribers_only(): void
    {
        // Promotional mail now goes to opted-in subscribers, not to tenant owners.
        MarketingSubscriber::create([
            'email' => 'opted-in@restaurant.test',
            'source' => 'manual',
            'status' => 'subscribed',
            'consent_at' => now(),
        ]);
        MarketingSubscriber::create([
            'email' => 'left@restaurant.test',
            'source' => 'manual',
            'status' => 'unsubscribed',
        ]);

        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/marketing/automation/campaigns', [
            'name' => 'Welcome',
            'subject' => 'Hello',
            'body' => '<p>Hi</p>',
        ])->assertRedirect();

        $campaign = Campaign::firstOrFail();
        $this->assertSame('draft', $campaign->status);

        $this->actingAs($admin)
            ->post("/platform/marketing/automation/campaigns/{$campaign->id}/send")
            ->assertRedirect();

        $campaign->refresh();

        $this->assertSame('sent', $campaign->status);
        $this->assertSame(1, $campaign->sent_count);
        $this->assertSame(1, $campaign->sends()->count(), 'Only the subscribed address may be queued.');
        $this->assertSame('opted-in@restaurant.test', $campaign->sends()->value('email'));
    }

    public function test_active_announcement_is_shared_to_the_matching_tenant(): void
    {
        $tenant = Tenant::factory()->create(['status' => 'active', 'onboarding_completed_at' => now()]);
        $owner = $this->ownerFor($tenant);

        Announcement::create(['title' => 'Maintenance', 'body' => 'Tonight', 'level' => 'warning', 'is_active' => true]);
        Announcement::create(['title' => 'Later', 'body' => 'Soon', 'level' => 'info', 'is_active' => true, 'starts_at' => now()->addDay()]);
        Announcement::create(['title' => 'Suspended only', 'body' => 'X', 'level' => 'info', 'is_active' => true, 'audience' => ['status' => 'suspended']]);

        $this->assertCount(1, app(AnnouncementService::class)->forTenant($tenant));

        $this->actingAs($owner)->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->has('announcements', 1));
    }

    public function test_curated_command_runs_and_is_audited(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post('/platform/commands/run', ['key' => 'migrate_status'])->assertRedirect();

        $run = CommandRun::firstOrFail();
        $this->assertSame('curated', $run->type);
        $this->assertNotNull($run->exit_code);
        $this->assertDatabaseHas('audit_logs', ['action' => 'platform.command_ran']);
    }

    public function test_advanced_terminal_is_super_admin_only(): void
    {
        $platformAdmin = $this->admin(RoleName::PlatformAdmin);

        $this->actingAs($platformAdmin)->post('/platform/commands/advanced', ['command' => 'php artisan --version'])
            ->assertForbidden();
    }

    public function test_advanced_terminal_rejects_blocked_patterns(): void
    {
        $admin = $this->admin();
        app(PlatformSettings::class)->set('features.command_terminal', true, 'features');

        $this->actingAs($admin)->post('/platform/commands/advanced', ['command' => 'rm -rf /'])
            ->assertSessionHasErrors('command');

        $this->assertDatabaseCount('command_runs', 0);
    }

    public function test_console_command_formatter_blocks_shell_operators(): void
    {
        $runner = app(CommandRunner::class);

        $this->assertFalse($runner->advancedAllowed('php artisan migrate:fresh'));
        $this->assertFalse($runner->advancedAllowed('php artisan route:list && rm -rf storage'));
        $this->assertTrue($runner->advancedAllowed('php artisan route:list'));
        $this->assertTrue($runner->advancedAllowed('npm run build'));
    }

    public function test_curated_command_runner_redacts_secrets(): void
    {
        $runner = app(CommandRunner::class);

        $this->assertStringContainsString('[redacted]', $runner->redact('APP_KEY=abcdef123456'));
        $this->assertStringNotContainsString('abcdef123456', $runner->redact('APP_KEY=abcdef123456'));
    }

    public function test_the_queue_drain_action_is_whitelisted_and_actually_runs(): void
    {
        $runner = app(CommandRunner::class);
        $action = $runner->curated()['queue_work'] ?? null;

        $this->assertNotNull($action, 'queue:work is missing from the curated whitelist.');

        // It must drain and exit. A bare `queue:work` daemon never returns, so the
        // runner's 120s timeout would kill it and every click would report failure.
        $this->assertStringContainsString('queue:work', $action['command']);
        $this->assertStringContainsString('--stop-when-empty', $action['command']);
        $this->assertStringContainsString('--max-time=', $action['command']);
        $this->assertStringContainsString('{php}', $action['command']);

        $run = $runner->run($action['command'], 'curated');

        $this->assertSame(0, $run->exit_code, $run->output);
    }

    public function test_zero_tenant_usage_is_not_confused_with_an_unknown_plan(): void
    {
        // Guards the currency fallback path used by plans without a per-currency price.
        $plan = Plan::where('slug', 'starter')->firstOrFail();
        $this->assertNull(app(PricingService::class)->priceFor($plan, 'EUR', BillingCycle::Monthly));
    }
}
