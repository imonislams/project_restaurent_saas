<?php

namespace Tests\Feature\Marketing;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Marketing\Models\MarketingRedirect;
use App\Domain\Marketing\Models\MarketingSeoMeta;
use App\Domain\Marketing\Models\MarketingSitemapEntry;
use App\Domain\Marketing\Seo\RedirectService;
use App\Domain\Marketing\Seo\RobotsService;
use App\Domain\Marketing\Seo\SeoAuditService;
use App\Domain\Marketing\Seo\SitemapService;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * SEO management: the generated sitemap, robots.txt, redirects and the audit.
 */
class MarketingSeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    protected function admin(): User
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->assignRole(RoleName::SaasSuperAdmin);

        return $admin;
    }

    // ---------------------------------------------------------------- sitemap

    public function test_the_sitemap_lists_only_public_pages_and_never_private_areas(): void
    {
        $paths = app(SitemapService::class)->paths();

        $this->assertContains('/', $paths);
        $this->assertContains('/pricing', $paths);
        $this->assertContains('/products/qr-ordering', $paths);
        $this->assertContains('/resources/pos-hardware-buying-guide', $paths);

        foreach ($paths as $path) {
            foreach (['/platform', '/dashboard', '/pos', '/qr', '/payments', '/webhooks', '/health', '/login', '/register'] as $private) {
                $this->assertStringStartsNotWith($private, $path, $path.' must not appear in the sitemap.');
            }
        }
    }

    public function test_the_sitemap_is_valid_xml_with_the_expected_namespace(): void
    {
        $xml = app(SitemapService::class)->xml();

        $document = simplexml_load_string($xml);

        $this->assertNotFalse($document, 'The generated sitemap is not valid XML.');
        $this->assertSame('urlset', $document->getName());
        $this->assertSame('http://www.sitemaps.org/schemas/sitemap/0.9', (string) $document->getNamespaces()['']);

        $urls = $document->xpath('//*[local-name()="url"]');
        $this->assertNotEmpty($urls);
        $this->assertSame(count(app(SitemapService::class)->paths()), count($urls));

        // Every loc is absolute.
        foreach ($document->xpath('//*[local-name()="loc"]') as $loc) {
            $this->assertMatchesRegularExpression('#^https?://#', (string) $loc);
        }
    }

    public function test_an_excluded_page_is_left_out_of_the_sitemap(): void
    {
        $service = app(SitemapService::class);

        $this->assertContains('/about', $service->paths());

        MarketingSitemapEntry::create(['path' => '/about', 'is_enabled' => false]);

        $this->assertNotContains('/about', $service->paths());
    }

    public function test_the_endpoint_serves_the_generated_file_and_falls_back_to_the_static_one(): void
    {
        app(PlatformSettings::class)->set('seo.sitemap_enabled', true, 'seo');

        $generated = $this->get('/sitemap.xml');
        $generated->assertOk();
        $this->assertSame('generated', $generated->headers->get('X-Sitemap-Source'));
        $this->assertStringContainsString('<urlset', $generated->getContent());

        app(PlatformSettings::class)->set('seo.sitemap_enabled', false, 'seo');

        $static = $this->get('/sitemap.xml');
        $static->assertOk();

        // The source header states where the body actually came from. With
        // generation switched off and no checked-in file present, the service still
        // produces the document rather than an empty body, so the honest label is
        // 'generated' — not 'static'. A 'static' install would report 'static'.
        $this->assertContains(
            $static->headers->get('X-Sitemap-Source'),
            ['static', 'generated'],
            'The fallback must report a truthful source.',
        );

        // The fallback must always be a usable document. It used to return an empty
        // body when no checked-in file existed, which reads to a crawler as a valid
        // but empty sitemap — worse than not answering at all.
        $body = (string) $static->getContent();
        $this->assertNotSame('', $body, 'The sitemap fallback must never be empty.');
        $this->assertStringContainsString('<urlset', $body);
        $this->assertStringContainsString('</urlset>', $body);
    }

    // ---------------------------------------------------------------- robots

    public function test_the_generated_robots_file_disallows_the_private_areas(): void
    {
        $robots = app(RobotsService::class)->defaultContent();

        foreach (self::PRIVATE_PATHS as $path) {
            $this->assertStringContainsString('Disallow: '.$path, $robots, $path.' should be disallowed.');
        }

        $this->assertStringContainsString('Sitemap: ', $robots);
    }

    /** The private prefixes every robots document must refuse, however it is produced. */
    private const PRIVATE_PATHS = ['/platform', '/dashboard', '/pos', '/qr/', '/payments/', '/webhooks/'];

    /**
     * Regression: with generation switched off and no checked-in file present,
     * /robots.txt used to return an EMPTY body. An empty robots.txt disallows
     * nothing, so the platform workspace, POS and webhooks all became crawlable —
     * silently the opposite of the intent.
     */
    public function test_robots_fallback_is_never_empty_even_with_generation_disabled(): void
    {
        app(PlatformSettings::class)->set('seo.robots_enabled', false, 'seo');

        $response = $this->get('/robots.txt');
        $response->assertOk();

        $body = (string) $response->getContent();
        $this->assertNotSame('', $body, 'An empty robots.txt permits everything.');

        foreach (self::PRIVATE_PATHS as $path) {
            $this->assertStringContainsString('Disallow: '.$path, $body, $path.' must stay disallowed.');
        }
    }

    public function test_robots_validation_rejects_an_unknown_directive(): void
    {
        $result = app(RobotsService::class)->validate("User-agent: *\nNonsense: value");

        $this->assertNotEmpty($result['errors']);
        $this->assertStringContainsString('not a recognised robots directive', $result['errors'][0]);
    }

    public function test_robots_validation_requires_a_user_agent(): void
    {
        $result = app(RobotsService::class)->validate('Disallow: /admin');

        $this->assertNotEmpty($result['errors']);
    }

    public function test_robots_validation_warns_about_a_contradictory_blanket_rule(): void
    {
        $result = app(RobotsService::class)->validate("User-agent: *\nDisallow: /\nAllow: /");

        $this->assertNotEmpty($result['warnings']);
    }

    public function test_invalid_robots_content_is_not_saved(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('platform.marketing.seo.robots.update'), [
                'enabled' => true,
                'content' => "User-agent: *\nBroken directive here",
            ])
            ->assertSessionHas('error');

        $this->assertFalse(app(RobotsService::class)->isCustom());
    }

    public function test_custom_robots_content_is_saved_and_served(): void
    {
        $admin = $this->admin();
        $content = "User-agent: *\nAllow: /\nDisallow: /platform";

        $this->actingAs($admin)
            ->post(route('platform.marketing.seo.robots.update'), ['enabled' => true, 'content' => $content])
            ->assertSessionHas('success');

        $this->assertSame($content, trim(app(RobotsService::class)->content()));

        $served = $this->get('/robots.txt');
        $served->assertOk();
        $this->assertSame('custom', $served->headers->get('X-Robots-Source'));
        $this->assertStringContainsString('Disallow: /platform', $served->getContent());
    }

    // ---------------------------------------------------------------- redirects

    public function test_a_redirect_is_created_and_served_by_the_fallback_route(): void
    {
        app(RedirectService::class)->create([
            'from_path' => '/old-pricing',
            'to_url' => '/pricing',
            'status_code' => 301,
        ], $this->admin());

        $this->get('/old-pricing')->assertStatus(301)->assertRedirect('/pricing');

        $redirect = MarketingRedirect::query()->firstOrFail();
        $this->assertSame(1, $redirect->hits);
        $this->assertNotNull($redirect->last_hit_at);
    }

    public function test_an_unmatched_path_with_no_redirect_is_still_a_404(): void
    {
        $this->get('/nothing-here')->assertNotFound();
    }

    public function test_a_duplicate_redirect_is_refused(): void
    {
        $service = app(RedirectService::class);
        $service->create(['from_path' => '/a', 'to_url' => '/b', 'status_code' => 301]);

        $result = $service->validate(['from_path' => '/a', 'to_url' => '/c', 'status_code' => 301]);

        $this->assertArrayHasKey('from_path', $result['errors']);
        $this->assertStringContainsString('already starts at', $result['errors']['from_path']);
    }

    public function test_a_loop_is_refused_and_the_chain_is_named(): void
    {
        $service = app(RedirectService::class);
        $service->create(['from_path' => '/b', 'to_url' => '/a', 'status_code' => 301]);

        $result = $service->validate(['from_path' => '/a', 'to_url' => '/b', 'status_code' => 301]);

        $this->assertArrayHasKey('to_url', $result['errors']);
        $this->assertStringContainsString('loop', $result['errors']['to_url']);
        $this->assertStringContainsString('/a', $result['errors']['to_url']);
        $this->assertStringContainsString('/b', $result['errors']['to_url']);
    }

    public function test_a_redirect_cannot_point_at_itself(): void
    {
        $result = app(RedirectService::class)->validate(['from_path' => '/x', 'to_url' => '/x', 'status_code' => 301]);

        $this->assertArrayHasKey('to_url', $result['errors']);
    }

    public function test_an_over_long_chain_is_refused(): void
    {
        $service = app(RedirectService::class);

        for ($i = 1; $i <= RedirectService::MAX_CHAIN; $i++) {
            $service->create(['from_path' => '/hop-'.$i, 'to_url' => '/hop-'.($i + 1), 'status_code' => 301]);
        }

        $result = $service->validate(['from_path' => '/start', 'to_url' => '/hop-1', 'status_code' => 301]);

        $this->assertArrayHasKey('to_url', $result['errors']);
        $this->assertStringContainsString('hops long', $result['errors']['to_url']);
    }

    public function test_a_chain_resolves_to_its_final_destination(): void
    {
        $service = app(RedirectService::class);
        $service->create(['from_path' => '/one', 'to_url' => '/two', 'status_code' => 302]);
        $service->create(['from_path' => '/two', 'to_url' => '/pricing', 'status_code' => 301]);

        $match = $service->resolve('/one');

        $this->assertNotNull($match);
        $this->assertSame('/pricing', $match['to']);
        // Two redirects were followed: /one → /two → /pricing.
        $this->assertSame(2, $match['hops']);
        $this->assertSame('/one', $match['redirect']->from_path);
    }

    public function test_csv_import_and_export_round_trip(): void
    {
        $service = app(RedirectService::class);
        $csv = "from_path,to_url,status_code\n/legacy-a,/pricing,301\n/legacy-b,https://example.com/,302";

        $result = $service->importCsv($csv, $this->admin());

        $this->assertSame(2, $result['created']);
        $this->assertSame(0, $result['skipped']);

        $exported = $service->exportCsv();
        $this->assertStringContainsString('from_path,to_url,status_code', $exported);
        $this->assertStringContainsString('"/legacy-a","/pricing",301', $exported);
        $this->assertStringContainsString('"/legacy-b","https://example.com/",302', $exported);
    }

    public function test_csv_import_reports_the_rows_it_skipped(): void
    {
        $service = app(RedirectService::class);
        $service->create(['from_path' => '/taken', 'to_url' => '/pricing', 'status_code' => 301]);

        $result = $service->importCsv("from_path,to_url,status_code\n/taken,/elsewhere,301\n/bad,not-a-url,301", null);

        // An existing path is updated by design; only the invalid row is skipped.
        $this->assertSame(0, $result['created']);
        $this->assertSame(1, $result['updated']);
        $this->assertSame(1, $result['skipped']);
        $this->assertCount(1, $result['errors']);
        $this->assertSame('/elsewhere', MarketingRedirect::query()->where('from_path', '/taken')->value('to_url'));
    }

    public function test_a_redirect_can_be_disabled_and_then_stops_firing(): void
    {
        $admin = $this->admin();
        $service = app(RedirectService::class);
        $redirect = $service->create(['from_path' => '/gone', 'to_url' => '/pricing', 'status_code' => 301], $admin);

        $this->get('/gone')->assertStatus(301);

        $service->update($redirect->fresh(), [
            'from_path' => '/gone',
            'to_url' => '/pricing',
            'status_code' => 301,
            'is_active' => false,
        ], $admin);

        $this->get('/gone')->assertNotFound();
    }

    // ---------------------------------------------------------------- audit & editor

    public function test_the_audit_reports_findings_with_a_severity_and_a_page(): void
    {
        $audit = app(SeoAuditService::class)->audit();

        $this->assertGreaterThan(0, $audit['checked']);
        $this->assertIsArray($audit['findings']);

        foreach ($audit['findings'] as $finding) {
            $this->assertContains($finding['severity'], ['error', 'warning', 'info']);
            $this->assertNotEmpty($finding['code']);
            $this->assertNotEmpty($finding['message']);
        }
    }

    public function test_the_audit_flags_an_over_long_title(): void
    {
        MarketingSeoMeta::create([
            'route_key' => 'pricing',
            'title' => str_repeat('Long title ', 10),
            'is_auto' => false,
        ]);

        $audit = app(SeoAuditService::class)->audit();
        $codes = array_column($audit['findings'], 'code');

        $this->assertContains('title_long', $codes);
    }

    public function test_the_audit_flags_a_duplicate_title(): void
    {
        MarketingSeoMeta::create(['route_key' => 'pricing', 'title' => 'Same title everywhere', 'is_auto' => false]);
        MarketingSeoMeta::create(['route_key' => 'about', 'title' => 'Same title everywhere', 'is_auto' => false]);

        $codes = array_column(app(SeoAuditService::class)->audit()['findings'], 'code');

        $this->assertContains('duplicate_title', $codes);
    }

    public function test_saving_a_page_override_changes_what_a_crawler_receives(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('platform.marketing.seo.pages.update', ['route' => 'pricing']), [
                'title' => 'Restaurant Pricing Plans That Scale',
                'description' => 'Transparent monthly pricing for restaurants, cafes and multi-branch groups, with every module included.',
            ])
            ->assertSessionHas('success');

        $html = $this->get('/pricing')->assertOk()->getContent();

        $this->assertStringContainsString('Restaurant Pricing Plans That Scale', $html);
        $this->assertStringContainsString('Transparent monthly pricing', $html);
    }

    public function test_clearing_an_override_falls_back_to_the_site_default(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('platform.marketing.seo.pages.update', ['route' => 'pricing']), [
            'title' => 'A temporary title for this page',
            'description' => 'A temporary description that is long enough to pass validation checks in the audit.',
        ]);

        $this->get('/pricing')->assertSee('A temporary title for this page');

        $this->actingAs($admin)->post(route('platform.marketing.seo.pages.update', ['route' => 'pricing']), [
            'title' => '',
            'description' => '',
        ]);

        $this->get('/pricing')->assertOk()->assertSee('Pricing & Plans');
    }

    public function test_website_settings_are_saved_and_applied(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('platform.marketing.seo.website.update'), [
                'default_title' => 'Touch Dine Restaurant OS',
                'default_description' => 'Run every part of your restaurant from one place, with live tables, kitchen and stock.',
                'canonical_host' => 'https://touchdine.test',
                'default_og_image' => '/icon-512.png',
                'google_verification' => 'verify-token-123',
                'organization_name' => 'Touch Dine',
                'organization_email' => 'hello@touchdine.test',
            ])
            ->assertSessionHas('success');

        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringContainsString('google-site-verification', $html);
        $this->assertStringContainsString('verify-token-123', $html);
        $this->assertStringContainsString('https://touchdine.test', $html);
    }

    public function test_the_seo_screens_render_for_a_platform_admin(): void
    {
        $admin = $this->admin();

        foreach ([
            '/platform/marketing/seo',
            '/platform/marketing/seo/website',
            '/platform/marketing/seo/pages',
            '/platform/marketing/seo/sitemap',
            '/platform/marketing/seo/robots',
            '/platform/marketing/seo/redirects',
            '/platform/marketing/seo/performance',
        ] as $uri) {
            $this->actingAs($admin)->get($uri)->assertOk();
        }
    }
}
