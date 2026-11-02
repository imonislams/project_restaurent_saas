<?php

namespace Tests\Feature\Marketing;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\Models\MarketingConsentRecord;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\Marketing\Seo\SeoService;
use App\Domain\Marketing\VisitorTracker;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The public tracking surface and the server-rendered SEO head.
 *
 * The head assertions read the raw HTTP response, not an Inertia prop — the point of
 * the change is that a crawler running no JavaScript sees real metadata.
 */
class MarketingPublicTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function visitorWithConsent(array $categories = ['analytics' => true]): string
    {
        $visitorId = (string) Str::uuid();
        app(ConsentService::class)->record($categories, $visitorId);

        return $visitorId;
    }

    public function test_the_homepage_renders_real_seo_metadata_server_side(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringContainsString('<title inertia>', $html);
        $this->assertStringContainsString('name="description"', $html);
        $this->assertStringContainsString('rel="canonical"', $html);
        $this->assertStringContainsString('property="og:title"', $html);
        $this->assertStringContainsString('property="og:image"', $html);
        $this->assertStringContainsString('name="twitter:card"', $html);
        $this->assertStringContainsString('application/ld+json', $html);
    }

    public function test_the_brand_is_appended_exactly_once(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        // The old bug: MarketingHead appended the brand and the Inertia title
        // callback appended it again.
        $this->assertStringNotContainsString('Touch Dine - Touch Dine', $html);
        $this->assertStringNotContainsString('| Touch Dine', $html);
        $this->assertStringContainsString('- Touch Dine', $html);
    }

    public function test_every_public_route_in_the_metadata_set_resolves(): void
    {
        $seo = app(SeoService::class);

        foreach (SeoService::PUBLIC_ROUTE_NAMES as $route) {
            // A route without parameters has to produce a title and description.
            if (in_array($route, ['products.show', 'features.show', 'solutions.show', 'resources.show', 'lp.show'], true)) {
                continue;
            }

            $meta = $seo->forRoute($route, 'https://example.test/'.$route);

            $this->assertNotSame('', $meta['title'], $route.' has no title.');
            $this->assertNotSame('', $meta['description'], $route.' has no description.');
            $this->assertSame('https://example.test/'.$route, $meta['canonical']);
            $this->assertStringContainsString('index', $meta['robots']);
        }
    }

    public function test_an_admin_page_receives_no_seo_prop(): void
    {
        $this->assertNotContains('platform.dashboard', SeoService::PUBLIC_ROUTE_NAMES);

        $this->seed(RolePermissionSeeder::class);

        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        $this->actingAs($admin)
            ->get('/platform/marketing')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->missing('seo'));
    }

    public function test_an_unknown_resource_slug_is_a_404_instead_of_a_duplicate_page(): void
    {
        $this->get('/resources/not-a-real-guide')->assertNotFound();
        $this->get('/resources/calculating-true-food-cost-percentage')->assertOk();
    }

    public function test_nothing_is_stored_for_a_visitor_who_has_not_consented(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $this->assertSame(0, MarketingVisitor::query()->count());
        $this->assertSame(0, MarketingEvent::query()->count());
        $response->assertCookieMissing(VisitorTracker::COOKIE);
    }

    public function test_a_consenting_visitor_gets_a_first_party_id_and_a_page_view(): void
    {
        $visitorId = $this->visitorWithConsent();

        $response = $this->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)->get('/');

        $response->assertOk();

        $this->assertSame(1, MarketingVisitor::query()->count());
        $this->assertSame($visitorId, MarketingVisitor::query()->firstOrFail()->visitor_id);
        $this->assertSame(1, MarketingEvent::query()->where('name', 'page_view')->count());
    }

    public function test_the_ingestion_endpoint_drops_an_event_without_consent(): void
    {
        $visitorId = (string) Str::uuid();

        $this->withCredentials()
            ->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)
            ->postJson('/marketing/events', ['name' => 'page_view'])
            ->assertStatus(202)
            ->assertJson(['stored' => false]);

        $this->assertSame(0, MarketingEvent::query()->count());
    }

    public function test_the_ingestion_endpoint_stores_an_event_once_consent_exists(): void
    {
        $visitorId = $this->visitorWithConsent();

        $this->withCredentials()
            ->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)
            ->postJson('/marketing/events', [
                'name' => 'view_content',
                'path' => '/pricing',
                'properties' => ['plan' => 'pro'],
            ])
            ->assertStatus(201)
            ->assertJson(['stored' => true]);

        $event = MarketingEvent::query()->firstOrFail();
        $this->assertSame('view_content', $event->name->value);
        $this->assertSame('/pricing', $event->path);
        $this->assertSame($visitorId, $event->visitor_id);
        $this->assertSame('client', $event->source);
    }

    public function test_an_uncatalogued_event_name_is_rejected(): void
    {
        $visitorId = $this->visitorWithConsent();

        $this->withCredentials()
            ->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)
            ->postJson('/marketing/events', ['name' => 'made_up_event'])
            ->assertStatus(422);

        $this->assertSame(0, MarketingEvent::query()->count());
    }

    public function test_a_consent_decision_is_recorded_and_returned(): void
    {
        $response = $this->postJson('/marketing/consent', [
            'categories' => ['analytics' => true, 'advertising' => false],
            'action' => 'granted',
        ])->assertOk();

        $granted = $response->json('granted');

        $this->assertTrue($granted['analytics']);
        $this->assertFalse($granted['advertising']);
        $this->assertTrue($granted['essential'], 'Essential consent cannot be withheld.');

        $this->assertSame(1, MarketingConsentRecord::query()->count());
        $this->assertNotNull($response->headers->getCookies()[0]->getValue() ?: null);
    }

    public function test_a_withdrawal_is_appended_rather_than_overwriting_history(): void
    {
        $visitorId = $this->visitorWithConsent(['analytics' => true, 'advertising' => true]);

        $this->withCredentials()
            ->withUnencryptedCookie(VisitorTracker::COOKIE, $visitorId)
            ->postJson('/marketing/consent', [
                'categories' => ['analytics' => false, 'advertising' => false],
                'action' => 'withdrawn',
            ])
            ->assertOk();

        $this->assertSame(2, MarketingConsentRecord::query()->count());
        $this->assertFalse(app(ConsentService::class)->allows('analytics', $visitorId));
        $first = MarketingConsentRecord::query()->oldest('id')->firstOrFail();
        $this->assertTrue($first->categories['analytics'], 'The earlier grant is history and must not be rewritten.');
    }

    public function test_the_browser_configuration_exposes_only_public_identifiers(): void
    {
        $props = $this->get('/')->assertOk()->viewData('page')['props'];

        $this->assertArrayHasKey('marketing', $props);
        $this->assertArrayHasKey('tracking', $props['marketing']);
        $this->assertArrayNotHasKey('access_token', $props['marketing']['tracking']);
        $this->assertSame(
            '/marketing/events',
            $props['marketing']['collect_url'],
        );
    }
}
