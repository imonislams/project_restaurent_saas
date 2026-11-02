<?php

namespace Tests\Feature\Marketing;

use App\Domain\Communications\Models\Campaign;
use App\Domain\Communications\Models\EmailLog;
use App\Domain\Marketing\Automation\AutomationService;
use App\Domain\Marketing\Email\EmailMarketingService;
use App\Domain\Marketing\Enums\AutomationTrigger;
use App\Domain\Marketing\Enums\LeadSource;
use App\Domain\Marketing\Enums\LeadStatus;
use App\Domain\Marketing\Enums\StepType;
use App\Domain\Marketing\Models\MarketingAutomation;
use App\Domain\Marketing\Models\MarketingAutomationEnrollment;
use App\Domain\Marketing\Models\MarketingAutomationStep;
use App\Domain\Marketing\Models\MarketingEmailSend;
use App\Domain\Marketing\Models\MarketingEmailSuppression;
use App\Domain\Marketing\Models\MarketingLead;
use App\Domain\Marketing\Models\MarketingSubscriber;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * The safety gates of marketing email.
 *
 * The claim this file exists to prove: nothing is sent without consent, a replayed
 * delivery or step never sends twice, and an unsubscribe takes effect even for mail
 * that was already queued.
 *
 * Mail is NOT faked here: the test environment uses the array transport, so the real
 * MessageSent event fires and the existing email log records every attempt — which is
 * exactly what the delivery report reads.
 */
class MarketingEmailDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function campaign(array $overrides = []): Campaign
    {
        return Campaign::create(array_merge([
            'name' => 'Winter launch',
            'subject' => 'A warmer winter menu',
            'body' => '<p>Hello there. <a href="https://example.test/pricing">See pricing</a></p>',
            'status' => 'draft',
            'track_opens' => true,
            'track_clicks' => true,
        ], $overrides));
    }

    protected function subscriber(string $email, string $status = 'subscribed'): MarketingSubscriber
    {
        return MarketingSubscriber::create([
            'email' => $email,
            'name' => ucfirst(explode('@', $email)[0]),
            'source' => 'manual',
            'status' => $status,
        ]);
    }

    public function test_a_campaign_of_two_recipients_produces_two_deliveries_and_two_email_log_entries(): void
    {
        $this->subscriber('one@restaurant.test');
        $this->subscriber('two@restaurant.test');

        $campaign = $this->campaign();

        // The test environment runs the queue synchronously, so this really sends.
        $result = app(EmailMarketingService::class)->queueCampaign($campaign);

        $this->assertSame(2, $result['queued']);

        $this->assertSame(2, MarketingEmailSend::query()->count());
        $this->assertSame(2, MarketingEmailSend::query()->where('status', 'sent')->count());

        // The platform's existing email log records each attempt.
        $this->assertDatabaseCount('email_logs', 2);
        $this->assertSame(2, EmailLog::query()
            ->where('subject', 'A warmer winter menu')->count());

        $campaign->refresh();
        $this->assertSame('sent', $campaign->status);
        $this->assertSame(2, $campaign->sent_count);
        $this->assertNotNull($campaign->sent_at);
    }

    public function test_an_unsubscribed_address_is_refused_at_send_time_even_after_it_was_queued(): void
    {
        Queue::fake();

        $subscriber = $this->subscriber('leaving@restaurant.test');
        $this->subscriber('staying@restaurant.test');

        $campaign = $this->campaign();
        $result = app(EmailMarketingService::class)->queueCampaign($campaign);

        $this->assertSame(2, $result['queued']);

        // They unsubscribe between queueing and delivery.
        $subscriber->forceFill(['status' => 'unsubscribed'])->save();
        MarketingEmailSuppression::create(['email' => 'leaving@restaurant.test', 'reason' => 'unsubscribe']);

        $service = app(EmailMarketingService::class);

        foreach (MarketingEmailSend::query()->get() as $send) {
            $service->send($send);
        }

        $this->assertSame('failed', MarketingEmailSend::query()->where('email', 'leaving@restaurant.test')->value('status'));
        $this->assertSame('sent', MarketingEmailSend::query()->where('email', 'staying@restaurant.test')->value('status'));

        // Only the allowed recipient reached the mail transport.
        $this->assertDatabaseCount('email_logs', 1);
    }

    public function test_replaying_a_delivery_does_not_send_a_second_email(): void
    {
        Queue::fake();

        $this->subscriber('once@restaurant.test');
        app(EmailMarketingService::class)->queueCampaign($this->campaign());

        $send = MarketingEmailSend::query()->firstOrFail();
        $service = app(EmailMarketingService::class);

        $service->send($send);
        $second = $service->send($send->fresh());

        $this->assertTrue($second['ok']);
        $this->assertSame('already sent', $second['skipped']);
        $this->assertSame(1, EmailLog::query()->count());
    }

    public function test_a_lead_without_marketing_consent_is_never_emailed(): void
    {
        MarketingLead::create([
            'name' => 'No Consent',
            'email' => 'noconsent@restaurant.test',
            'source' => LeadSource::ContactForm->value,
            'status' => LeadStatus::New->value,
            'consent_marketing' => false,
        ]);

        $gate = app(EmailMarketingService::class)->mayEmail('noconsent@restaurant.test');

        $this->assertFalse($gate['ok']);
        $this->assertStringContainsString('has not granted marketing consent', (string) $gate['reason']);
    }

    public function test_an_unknown_address_has_no_consent_basis(): void
    {
        $gate = app(EmailMarketingService::class)->mayEmail('stranger@restaurant.test');

        $this->assertFalse($gate['ok']);
        $this->assertStringContainsString('not a subscriber', (string) $gate['reason']);
    }

    public function test_the_unsubscribe_link_applies_immediately_and_suppresses_the_address(): void
    {
        Queue::fake();

        $subscriber = $this->subscriber('bye@restaurant.test');
        app(EmailMarketingService::class)->queueCampaign($this->campaign());

        $send = MarketingEmailSend::query()->firstOrFail();

        $this->get('/m/u/'.$send->token)->assertOk();

        $this->assertSame('unsubscribed', $subscriber->fresh()->status);
        $this->assertDatabaseHas('marketing_email_suppressions', ['email' => 'bye@restaurant.test']);

        // And nothing further can be sent to them.
        $this->assertFalse(app(EmailMarketingService::class)->mayEmail('bye@restaurant.test')['ok']);
    }

    public function test_an_unknown_unsubscribe_token_renders_an_invalid_state_rather_than_erroring(): void
    {
        $this->get('/m/u/'.fake()->uuid())->assertOk();
        $this->get('/m/u/not-a-token')->assertOk();
    }

    public function test_the_open_pixel_records_a_single_open(): void
    {
        Queue::fake();

        $this->subscriber('reader@restaurant.test');
        app(EmailMarketingService::class)->queueCampaign($this->campaign());

        $send = MarketingEmailSend::query()->firstOrFail();
        $service = app(EmailMarketingService::class);
        $service->send($send);

        $response = $this->get('/m/o/'.$send->token.'.gif');
        $response->assertOk();
        $this->assertSame('image/gif', $response->headers->get('Content-Type'));

        $this->assertNotNull($send->fresh()->opened_at);

        $openedAt = $send->fresh()->opened_at;

        // A second fetch must not move the timestamp.
        $this->get('/m/o/'.$send->token.'.gif')->assertOk();
        $this->assertSame($openedAt->toIso8601String(), $send->fresh()->opened_at->toIso8601String());
    }

    public function test_a_click_is_recorded_and_redirects_to_the_target(): void
    {
        Queue::fake();

        $this->subscriber('clicker@restaurant.test');
        app(EmailMarketingService::class)->queueCampaign($this->campaign());

        $send = MarketingEmailSend::query()->firstOrFail();
        $service = app(EmailMarketingService::class);
        $service->send($send);

        $this->get('/m/c/'.$send->token.'?u='.rawurlencode('https://example.test/pricing'))
            ->assertRedirect('https://example.test/pricing');

        $this->assertNotNull($send->fresh()->first_click_at);
        $this->assertDatabaseHas('marketing_email_clicks', ['send_id' => $send->getKey()]);
    }

    public function test_a_click_target_must_be_an_absolute_http_url(): void
    {
        Queue::fake();

        $this->subscriber('safe@restaurant.test');
        app(EmailMarketingService::class)->queueCampaign($this->campaign());

        $send = MarketingEmailSend::query()->firstOrFail();

        // A tracking endpoint must not become an open redirect to a script URL.
        $this->get('/m/c/'.$send->token.'?u='.rawurlencode('javascript:alert(1)'))->assertNotFound();
        $this->get('/m/c/'.$send->token)->assertNotFound();
    }

    public function test_the_delivery_report_states_that_bounce_data_is_unavailable(): void
    {
        $campaign = $this->campaign();

        $stats = app(EmailMarketingService::class)->stats($campaign);

        $this->assertNull($stats['bounces']);
        $this->assertNotEmpty($stats['bounces_reason']);
        $this->assertStringContainsString('webhooks', $stats['bounces_reason']);
    }

    // ------------------------------------------------------------- automation

    protected function automationWithOneStep(string $email): array
    {
        $lead = MarketingLead::create([
            'name' => 'Automation Subject',
            'email' => $email,
            'source' => LeadSource::ContactForm->value,
            'status' => LeadStatus::New->value,
            'consent_marketing' => true,
            'consent_at' => now(),
        ]);

        $automation = MarketingAutomation::create([
            'name' => 'Welcome sequence',
            'key' => 'welcome-'.fake()->unique()->slug(2),
            'trigger_type' => AutomationTrigger::LeadCreated->value,
            'status' => 'active',
        ]);

        MarketingAutomationStep::create([
            'automation_id' => $automation->getKey(),
            'sort_order' => 0,
            'type' => StepType::Email->value,
            'config' => ['body' => '<p>Welcome aboard.</p>'],
        ]);

        $enrollment = MarketingAutomationEnrollment::create([
            'automation_id' => $automation->getKey(),
            'subject_type' => MarketingLead::class,
            'subject_id' => $lead->getKey(),
            'status' => 'active',
            'current_step' => 0,
            'enrolled_at' => now(),
            'next_run_at' => now(),
        ]);

        return [$automation, $enrollment, $lead];
    }

    public function test_an_automation_step_sends_once_and_a_replay_does_nothing(): void
    {
        [, $enrollment] = $this->automationWithOneStep('subject@restaurant.test');

        $automations = app(AutomationService::class);

        $this->assertSame('sent', $automations->advance($enrollment));
        $this->assertSame(1, EmailLog::query()->count());
        $this->assertSame(1, $enrollment->logs()->count());

        // Rewind and replay the same step.
        $enrollment->forceFill(['current_step' => 0, 'status' => 'active'])->save();

        $this->assertSame('skipped', $automations->advance($enrollment->fresh()));
        $this->assertSame(1, EmailLog::query()->count(), 'A replayed step must not send twice.');
    }

    public function test_a_suppressed_subject_stops_the_enrolment(): void
    {
        [, $enrollment] = $this->automationWithOneStep('suppressed@restaurant.test');

        MarketingEmailSuppression::create(['email' => 'suppressed@restaurant.test', 'reason' => 'unsubscribe']);

        $this->assertSame('skipped', app(AutomationService::class)->advance($enrollment));

        $enrollment->refresh();

        $this->assertSame('stopped', $enrollment->status);
        $this->assertStringContainsString('suppression', (string) $enrollment->stop_reason);
        $this->assertSame(0, EmailLog::query()->count());
    }

    public function test_the_presets_seed_fourteen_draft_workflows_once(): void
    {
        $service = app(AutomationService::class);

        $this->assertSame(14, $service->seedPresets());
        $this->assertSame(0, $service->seedPresets(), 'Replicating presets must be idempotent.');

        $this->assertSame(14, MarketingAutomation::query()->count());
        $this->assertSame(14, MarketingAutomation::query()->where('is_system', true)->count());
        // Seeded as drafts: a deploy must never start mailing people.
        $this->assertSame(0, MarketingAutomation::query()->where('status', 'active')->count());
    }

    public function test_the_runner_command_processes_due_enrolments(): void
    {
        $this->automationWithOneStep('runner@restaurant.test');

        $this->artisan('marketing:run-automations')
            ->expectsOutputToContain('Processed 1 enrolment')
            ->assertSuccessful();

        $this->assertSame(1, EmailLog::query()->count());
    }
}
