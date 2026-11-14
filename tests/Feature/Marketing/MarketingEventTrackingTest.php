<?php

namespace Tests\Feature\Marketing;

use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Enums\DeviceCategory;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\MarketingEventService;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\Marketing\VisitorTracker;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Visitor resolution and the event ledger.
 *
 * The two behaviours worth pinning: a client-sourced event is dropped without
 * consent, and a replayed event is deduplicated on its stable event_id.
 */
class MarketingEventTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected VisitorTracker $tracker;

    protected ConsentService $consent;

    protected MarketingEventService $events;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tracker = app(VisitorTracker::class);
        $this->consent = app(ConsentService::class);
        $this->events = app(MarketingEventService::class);
    }

    /** @param array<string, string> $query */
    protected function request(array $query = [], ?string $visitorId = null, ?string $referrer = null, ?string $userAgent = null): Request
    {
        $uri = '/pricing'.($query === [] ? '' : '?'.http_build_query($query));
        $request = Request::create($uri, 'GET');

        if ($visitorId !== null) {
            $request->cookies->set(VisitorTracker::COOKIE, $visitorId);
        }

        if ($referrer !== null) {
            $request->headers->set('referer', $referrer);
        }

        $request->headers->set('user-agent', $userAgent ?? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

        return $request;
    }

    public function test_a_visit_creates_a_visitor_with_its_acquisition_context(): void
    {
        $visitorId = $this->tracker->newVisitorId();

        $visitor = $this->tracker->track(
            $this->request([
                'utm_source' => 'google',
                'utm_medium' => 'cpc',
                'utm_campaign' => 'restaurant-pos-q4',
            ], $visitorId),
            $visitorId,
            '/pricing',
        );

        $this->assertSame($visitorId, $visitor->visitor_id);
        $this->assertSame('/pricing', $visitor->first_path);
        $this->assertSame('google', $visitor->first_source);
        $this->assertSame('restaurant-pos-q4', $visitor->first_campaign);
        $this->assertSame(MarketingChannel::GoogleAds, $visitor->channel);
        $this->assertSame(1, $visitor->pageview_count);
    }

    public function test_the_ip_address_is_hashed_and_never_stored_raw(): void
    {
        $visitorId = $this->tracker->newVisitorId();
        $visitor = $this->tracker->track($this->request([], $visitorId), $visitorId, '/');

        $this->assertNotNull($visitor->ip_hash);
        $this->assertSame(64, strlen($visitor->ip_hash));
        $this->assertNotSame('127.0.0.1', $visitor->ip_hash);
    }

    public function test_a_device_is_classified_from_the_user_agent(): void
    {
        $this->assertSame(DeviceCategory::Mobile, DeviceCategory::fromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148'));
        $this->assertSame(DeviceCategory::Tablet, DeviceCategory::fromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'));
        $this->assertSame(DeviceCategory::Bot, DeviceCategory::fromUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)'));
        $this->assertSame(DeviceCategory::Desktop, DeviceCategory::fromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'));
    }

    public function test_a_later_visit_updates_the_last_touch_without_losing_the_first_touch(): void
    {
        $visitorId = $this->tracker->newVisitorId();

        $this->tracker->track($this->request(['utm_source' => 'google', 'utm_medium' => 'cpc'], $visitorId), $visitorId, '/pricing');
        $visitor = $this->tracker->track($this->request([], $visitorId), $visitorId, '/features');

        $this->assertSame('google', $visitor->first_source);
        $this->assertSame('/features', $visitor->last_path);
        $this->assertSame(2, $visitor->pageview_count);
        // The acquisition channel does not drift on a later direct visit.
        $this->assertSame(MarketingChannel::GoogleAds, $visitor->channel);
    }

    public function test_internal_platform_admin_traffic_is_not_tracked(): void
    {
        // The flag alone marks platform-admin traffic; no role is needed for that.
        $admin = User::factory()->platformAdmin()->create();

        $request = $this->request();
        $request->setUserResolver(fn () => $admin);

        $this->assertTrue($admin->isPlatformAdmin());
        $this->assertFalse($this->tracker->shouldTrack($request));

        $request = $this->request();
        $request->setUserResolver(fn () => null);
        $this->assertTrue($this->tracker->shouldTrack($request));
    }

    public function test_a_client_event_is_dropped_when_consent_has_not_been_granted(): void
    {
        $visitorId = $this->tracker->newVisitorId();

        $event = $this->events->record(EventName::PageView, [], [], $this->request([], $visitorId));

        $this->assertNull($event);
        $this->assertSame(0, MarketingEvent::query()->count());
    }

    public function test_a_client_event_is_recorded_once_analytics_consent_is_granted(): void
    {
        $visitorId = $this->tracker->newVisitorId();
        $this->consent->record(['analytics' => true], $visitorId);

        $event = $this->events->record(EventName::PageView, [], [], $this->request([], $visitorId));

        $this->assertNotNull($event);
        $this->assertSame('client', $event->source);
        $this->assertSame(EventName::PageView, $event->name);
    }

    public function test_a_server_event_is_a_business_record_and_does_not_need_tracking_consent(): void
    {
        $event = $this->events->record(EventName::RegistrationCompleted, [
            'tenant_id' => null,
            'path' => '/register',
        ]);

        $this->assertNotNull($event);
        $this->assertSame('server', $event->source);
        $this->assertSame(EventName::RegistrationCompleted, $event->name);
    }

    public function test_a_replayed_event_is_deduplicated_on_its_event_id(): void
    {
        $eventId = (string) Str::uuid();

        $first = $this->events->record(EventName::RegistrationCompleted, [], [], null, $eventId);
        $second = $this->events->record(EventName::RegistrationCompleted, [], [], null, $eventId);

        $this->assertSame($first->getKey(), $second->getKey());
        $this->assertSame(1, MarketingEvent::query()->count());
    }

    public function test_event_properties_cannot_smuggle_personal_data(): void
    {
        $event = $this->events->record(EventName::RegistrationCompleted, [], [
            'email' => 'owner@restaurant.test',
            'phone' => '+8801700000000',
            'plan' => 'pro',
            'nested' => ['anything' => 'value'],
        ]);

        $this->assertArrayNotHasKey('email', $event->properties);
        $this->assertArrayNotHasKey('phone', $event->properties);
        $this->assertArrayNotHasKey('nested', $event->properties);
        $this->assertSame('pro', $event->properties['plan']);
    }

    public function test_an_event_inherits_the_channel_and_utm_context_of_the_visitor(): void
    {
        $visitorId = $this->tracker->newVisitorId();
        $this->tracker->track(
            $this->request(['utm_source' => 'facebook', 'utm_medium' => 'paid'], $visitorId),
            $visitorId,
            '/pricing',
        );

        $event = $this->events->record(EventName::ViewContent, ['visitor_id' => $visitorId], [], null);

        $this->assertSame(MarketingChannel::MetaAds, $event->channel);
        $this->assertSame('facebook', $event->utm_source);
        $this->assertSame('/pricing', $event->path);
    }

    public function test_the_category_of_an_event_decides_which_consent_governs_it(): void
    {
        $this->assertSame('analytics', EventName::PageView->category()->value);
        $this->assertSame('advertising', EventName::Lead->category()->value);
        $this->assertSame('advertising', EventName::Purchase->category()->value);
    }

    public function test_the_event_catalog_maps_to_meta_events_only_where_an_equivalent_exists(): void
    {
        $this->assertSame('CompleteRegistration', EventName::RegistrationCompleted->metaEventName());
        $this->assertSame('StartTrial', EventName::StartTrial->metaEventName());
        $this->assertSame('Purchase', EventName::Purchase->metaEventName());
        $this->assertNull(EventName::RegistrationStarted->metaEventName());
        $this->assertNull(EventName::SubscriptionCancelled->metaEventName());
    }

    public function test_visitors_and_events_start_empty_so_no_metric_is_fabricated(): void
    {
        $this->assertSame(0, MarketingVisitor::query()->count());
        $this->assertSame(0, MarketingEvent::query()->count());
    }
}
