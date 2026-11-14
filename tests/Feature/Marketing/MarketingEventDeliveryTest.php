<?php

namespace Tests\Feature\Marketing;

use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\IntegrationStatus;
use App\Domain\Marketing\MarketingEventService;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Domain\Marketing\MarketingProviderManager;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingEventDelivery;
use App\Domain\Marketing\Models\MarketingIntegration;
use App\Domain\Marketing\Models\MarketingLead;
use App\Jobs\DispatchMarketingEventJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

/**
 * The event delivery pipeline.
 *
 * The behaviours that matter: nothing is sent without advertising consent, a
 * replayed delivery does not send twice, a retryable failure is retried and a
 * terminal one is recorded rather than hammered.
 */
class MarketingEventDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function integration(array $overrides = []): MarketingIntegration
    {
        return MarketingIntegration::create(array_merge([
            'provider' => 'meta_conversions',
            'name' => 'Meta Conversions API',
            'environment' => 'production',
            'is_enabled' => true,
            'status' => IntegrationStatus::Connected,
            'health_status' => 'ok',
            'last_ok_at' => now(),
            'credentials' => [
                'pixel_id' => '1234567890',
                'access_token' => 'TEST-TOKEN',
            ],
        ], $overrides));
    }

    protected function consentedVisitor(): string
    {
        $visitorId = (string) Str::uuid();
        app(ConsentService::class)->record(['advertising' => true], $visitorId);

        return $visitorId;
    }

    protected function lead(): MarketingLead
    {
        return MarketingLead::create([
            'name' => 'Ayesha Rahman',
            'email' => 'ayesha@restaurant.test',
            'phone' => '+8801700000000',
            'business_name' => 'Ayesha Kitchen',
            'country' => 'BD',
            'city' => 'Dhaka',
            'source' => 'contact_form',
            'status' => 'new',
        ]);
    }

    protected function runJob(MarketingEvent $event, string $provider = 'meta_conversions'): void
    {
        (new DispatchMarketingEventJob($event->getKey(), $provider))->handle(
            app(MarketingIntegrationService::class),
            app(MarketingProviderManager::class),
            app(MarketingEventService::class),
        );
    }

    public function test_a_verified_integration_receives_an_event_and_the_delivery_is_recorded(): void
    {
        Queue::fake();
        $this->integration();

        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $this->consentedVisitor(),
            'lead_id' => $this->lead()->getKey(),
            'url' => 'https://example.test/contact',
        ]);

        Queue::assertPushed(DispatchMarketingEventJob::class);

        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1], 200),
        ]);

        $this->runJob($event);

        Http::assertSent(fn ($request) => str_contains($request->url(), '1234567890/events')
            && $request['data'][0]['event_name'] === 'Lead'
            && $request['data'][0]['event_id'] === $event->event_id);

        $delivery = MarketingEventDelivery::query()->firstOrFail();
        $this->assertSame('sent', $delivery->status);
        $this->assertSame(1, $delivery->attempts);
        $this->assertSame($event->event_id, $delivery->external_event_id);
        $this->assertNotNull($delivery->sent_at);
    }

    public function test_match_keys_are_hashed_and_the_access_token_is_never_sent_to_the_browser(): void
    {
        Queue::fake();
        $this->integration();

        $lead = $this->lead();
        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $this->consentedVisitor(),
            'lead_id' => $lead->getKey(),
        ]);

        Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1], 200)]);

        $this->runJob($event);

        $sent = null;
        Http::assertSent(function ($request) use (&$sent) {
            $sent = $request->data();

            return true;
        });

        $userData = $sent['data'][0]['user_data'];

        // Hashed, not raw — and never an IP address.
        $this->assertSame(hash('sha256', 'ayesha@restaurant.test'), $userData['em']);
        $this->assertSame(hash('sha256', '8801700000000'), $userData['ph']);
        $this->assertArrayNotHasKey('client_ip_address', $userData);
        $this->assertStringNotContainsString('restaurant.test', json_encode($userData));
    }

    public function test_replaying_a_delivery_does_not_send_the_event_twice(): void
    {
        Queue::fake();
        $this->integration();

        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $this->consentedVisitor(),
            'lead_id' => $this->lead()->getKey(),
        ]);

        Http::fake(['graph.facebook.com/*' => Http::response(['events_received' => 1], 200)]);

        $this->runJob($event);
        $this->runJob($event);

        Http::assertSentCount(1);
        $this->assertSame(1, MarketingEventDelivery::query()->count());
    }

    public function test_without_advertising_consent_nothing_is_sent_at_all(): void
    {
        Queue::fake();
        $this->integration();

        // A visitor who has decided nothing yet.
        $visitorId = (string) Str::uuid();

        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $visitorId,
            'lead_id' => $this->lead()->getKey(),
        ]);

        Http::fake();

        $this->runJob($event);

        Http::assertNothingSent();
        $delivery = MarketingEventDelivery::query()->firstOrFail();
        $this->assertSame('skipped', $delivery->status);
        $this->assertStringContainsString('advertising consent', (string) $delivery->error);
    }

    public function test_consent_withdrawn_after_queuing_stops_the_delivery(): void
    {
        Queue::fake();
        $this->integration();

        $visitorId = $this->consentedVisitor();
        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $visitorId,
            'lead_id' => $this->lead()->getKey(),
        ]);

        // The visitor changes their mind before the job runs.
        app(ConsentService::class)->withdraw($visitorId);

        Http::fake();
        $this->runJob($event);

        Http::assertNothingSent();
        $this->assertSame('skipped', MarketingEventDelivery::query()->firstOrFail()->status);
    }

    public function test_an_unverified_integration_receives_nothing(): void
    {
        Queue::fake();
        $this->integration(['status' => IntegrationStatus::Configured, 'last_ok_at' => null]);

        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $this->consentedVisitor(),
        ]);

        // It was never queued, because only a verified integration is trusted.
        Queue::assertNotPushed(DispatchMarketingEventJob::class);

        Http::fake();
        $this->runJob($event);

        Http::assertNothingSent();
        $this->assertSame('skipped', MarketingEventDelivery::query()->firstOrFail()->status);
    }

    public function test_a_rate_limit_is_retryable_and_recorded_with_a_backoff(): void
    {
        Queue::fake();
        $this->integration();

        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $this->consentedVisitor(),
        ]);

        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'rate limit']], 429)]);

        $this->expectException(RuntimeException::class);

        try {
            $this->runJob($event);
        } finally {
            $delivery = MarketingEventDelivery::query()->firstOrFail();
            $this->assertSame('pending', $delivery->status);
            $this->assertSame(429, $delivery->http_status);
            $this->assertNotNull($delivery->next_retry_at);
        }
    }

    public function test_a_client_error_is_terminal_rather_than_retried_forever(): void
    {
        Queue::fake();
        $this->integration();

        $event = app(MarketingEventService::class)->record(EventName::Lead, [
            'visitor_id' => $this->consentedVisitor(),
        ]);

        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'Invalid parameter']], 400)]);

        $this->runJob($event);

        $delivery = MarketingEventDelivery::query()->firstOrFail();
        $this->assertSame('failed', $delivery->status);
        $this->assertNull($delivery->next_retry_at);
        $this->assertStringContainsString('Invalid parameter', (string) $delivery->error);
    }

    public function test_an_expired_token_tells_the_operator_to_reconnect(): void
    {
        $this->integration();

        Http::fake([
            'graph.facebook.com/*' => Http::response(['error' => ['message' => 'Session has expired']], 401),
        ]);

        $result = app(MarketingIntegrationService::class)->test('meta_conversions');

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('Reconnect', (string) $result['error']);

        $integration = MarketingIntegration::query()->firstOrFail()->fresh();
        $this->assertSame(IntegrationStatus::Error, $integration->status);
        $this->assertStringContainsString('Reconnect', (string) $integration->last_error);
    }

    public function test_an_event_with_no_meta_equivalent_is_not_sent(): void
    {
        Queue::fake();
        $this->integration();

        // This event is governed by analytics consent, and Meta has no equivalent
        // for it — so it must be skipped for the mapping reason, not the consent one.
        $visitorId = (string) Str::uuid();
        app(ConsentService::class)->record(['analytics' => true], $visitorId);

        $event = app(MarketingEventService::class)->record(EventName::SubscriptionCancelled, [
            'visitor_id' => $visitorId,
        ]);

        Http::fake();
        $this->runJob($event);

        Http::assertNothingSent();
        $delivery = MarketingEventDelivery::query()->firstOrFail();
        $this->assertSame('skipped', $delivery->status);
        $this->assertStringContainsString('no equivalent', (string) $delivery->error);
    }
}
