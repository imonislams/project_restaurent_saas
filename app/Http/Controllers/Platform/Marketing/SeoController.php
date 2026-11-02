<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingRedirect;
use App\Domain\Marketing\Seo\RobotsService;
use App\Domain\Marketing\Seo\SeoAuditService;
use App\Domain\Marketing\Seo\SeoService;
use App\Domain\Marketing\Seo\SitemapService;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SEO management: the dashboard with its audit, the site-wide defaults that every
 * page inherits, per-page overrides, and the Search Console performance view.
 */
class SeoController extends Controller
{
    public function __construct(
        protected SeoService $seo,
        protected SitemapService $sitemap,
        protected RobotsService $robots,
        protected PlatformSettings $settings,
        protected AuditLogger $audit,
    ) {}

    public function dashboard(SeoAuditService $audit): Response
    {
        return Inertia::render('Platform/Marketing/Seo/Dashboard', [
            'audit' => $audit->audit(),
            'sitemap' => [
                'enabled' => $this->sitemap->enabled(),
                'url' => $this->sitemap->host().'/sitemap.xml',
                'urls' => count($this->sitemap->paths()),
                'last_generated_at' => $this->sitemap->lastGeneratedAt(),
            ],
            'robots' => [
                'enabled' => $this->robots->enabled(),
                'custom' => $this->robots->isCustom(),
                'url' => $this->sitemap->host().'/robots.txt',
            ],
            'redirects' => [
                'total' => MarketingRedirect::query()->count(),
                'active' => MarketingRedirect::query()->active()->count(),
                'hits' => (int) MarketingRedirect::query()->sum('hits'),
                'top' => MarketingRedirect::query()
                    ->orderByDesc('hits')
                    ->limit(5)
                    ->get()
                    ->map(fn (MarketingRedirect $redirect) => [
                        'from' => $redirect->from_path,
                        'to' => $redirect->to_url,
                        'hits' => $redirect->hits,
                    ])
                    ->all(),
            ],
            'tracking' => [
                'events' => MarketingEvent::query()->count(),
                'page_views' => MarketingEvent::query()->where('name', 'page_view')->count(),
            ],
        ]);
    }

    public function website(): Response
    {
        return Inertia::render('Platform/Marketing/Seo/Website', [
            'settings' => [
                'default_title' => (string) ($this->settings->get('seo.default_title') ?? ''),
                'default_description' => (string) ($this->settings->get('seo.default_description') ?? ''),
                'canonical_host' => (string) ($this->settings->get('seo.canonical_host') ?? ''),
                'default_og_image' => (string) ($this->settings->get('seo.default_og_image') ?? ''),
                'google_verification' => (string) ($this->settings->get('seo.google_verification') ?? ''),
                'organization_name' => (string) ($this->settings->get('general.platform_name') ?? ''),
                'organization_email' => (string) ($this->settings->get('general.support_email') ?? ''),
            ],
            'defaults' => $this->seo->defaults(),
        ]);
    }

    public function updateWebsite(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'default_title' => ['nullable', 'string', 'max:200'],
            'default_description' => ['nullable', 'string', 'max:320'],
            'canonical_host' => ['nullable', 'url', 'max:255'],
            'default_og_image' => ['nullable', 'string', 'max:500'],
            'google_verification' => ['nullable', 'string', 'max:200'],
            'organization_name' => ['nullable', 'string', 'max:150'],
            'organization_email' => ['nullable', 'email', 'max:150'],
        ]);

        foreach ([
            'seo.default_title' => $data['default_title'] ?? null,
            'seo.default_description' => $data['default_description'] ?? null,
            'seo.canonical_host' => $data['canonical_host'] ?? null,
            'seo.default_og_image' => $data['default_og_image'] ?? null,
            'seo.google_verification' => $data['google_verification'] ?? null,
        ] as $key => $value) {
            $this->settings->set($key, $value === '' ? null : $value, 'seo');
        }

        $this->settings->set('general.platform_name', $data['organization_name'] ?? null, 'general');
        $this->settings->set('general.support_email', $data['organization_email'] ?? null, 'general');

        $this->audit->log('marketing.seo_updated', null, [
            'scope' => 'website',
            'keys' => ['default_title', 'default_description', 'canonical_host', 'default_og_image', 'google_verification'],
        ], $request->user());

        return back()->with('success', 'Website SEO settings saved. Every page that has no override inherits them immediately.');
    }

    public function pages(): Response
    {
        return Inertia::render('Platform/Marketing/Seo/Pages', [
            'pages' => $this->seo->editablePages(array_keys(SitemapService::ROUTES)),
            'limits' => [
                'title' => [self::class, 'titleLimits'],
                'description' => [self::class, 'descriptionLimits'],
            ],
            'host' => $this->sitemap->host(),
        ]);
    }

    public function updatePage(Request $request, string $route): RedirectResponse
    {
        abort_unless(array_key_exists($route, SitemapService::ROUTES), 404, 'Unknown page.');

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:320'],
            'canonical' => ['nullable', 'url', 'max:500'],
            'og_title' => ['nullable', 'string', 'max:200'],
            'og_description' => ['nullable', 'string', 'max:320'],
            'og_image' => ['nullable', 'string', 'max:500'],
            'robots' => ['nullable', 'string', 'max:60'],
        ]);

        $meta = $this->seo->updateRouteMeta($route, $data + ['updated_by' => $request->user()?->getKey()]);

        $this->audit->log('marketing.seo_updated', $meta, [
            'scope' => 'page',
            'route' => $route,
            'overrides' => array_keys($meta->overrides()),
        ], $request->user());

        return back()->with('success', 'Metadata saved for '.$route.'. Blank fields now inherit the site defaults again.');
    }

    public function performance(): Response
    {
        $snapshot = app(MarketingIntegrationService::class)
            ->snapshot('search_console', 'gsc_snapshot');

        return Inertia::render('Platform/Marketing/Seo/Performance', [
            'snapshot' => $snapshot,
            'connected' => app(MarketingIntegrationService::class)->connected('search_console'),
            'sitemapUrl' => $this->sitemap->host().'/sitemap.xml',
        ]);
    }

    /** @return array{min: int, max: int} */
    public static function titleLimits(): array
    {
        return ['min' => SeoAuditService::TITLE_MIN, 'max' => SeoAuditService::TITLE_MAX];
    }

    /** @return array{min: int, max: int} */
    public static function descriptionLimits(): array
    {
        return ['min' => SeoAuditService::DESCRIPTION_MIN, 'max' => SeoAuditService::DESCRIPTION_MAX];
    }
}
