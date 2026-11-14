<?php

namespace App\Domain\Marketing\Seo;

use App\Domain\Marketing\Models\MarketingLandingPage;
use App\Domain\Marketing\Models\MarketingSitemapEntry;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\MarketingController;
use Illuminate\Support\Facades\Cache;

/**
 * Builds the public sitemap.
 *
 * The URL list is derived from the same constants the router uses
 * (MarketingController::PRODUCT_SLUGS and friends), so the sitemap cannot advertise
 * a page the site does not serve — which is exactly what had happened: the old static
 * file named five guides that were never published, while omitting the six that were.
 *
 * Private surfaces are excluded by construction: only whitelisted routes, published
 * landing pages and published guides can enter the list.
 */
class SitemapService
{
    public const CACHE_KEY = 'marketing.sitemap.xml';

    public const SETTINGS_KEY = 'seo.sitemap_last_generated_at';

    /**
     * Static public pages with their crawl hints.
     *
     * @var array<string, array{priority: string, changefreq: string}>
     */
    public const ROUTES = [
        'home' => ['priority' => '1.0', 'changefreq' => 'weekly'],
        'pricing' => ['priority' => '0.9', 'changefreq' => 'weekly'],
        'products.index' => ['priority' => '0.8', 'changefreq' => 'monthly'],
        'features.index' => ['priority' => '0.7', 'changefreq' => 'monthly'],
        'solutions.index' => ['priority' => '0.7', 'changefreq' => 'monthly'],
        'resources.index' => ['priority' => '0.7', 'changefreq' => 'weekly'],
        'about' => ['priority' => '0.5', 'changefreq' => 'yearly'],
        'contact' => ['priority' => '0.6', 'changefreq' => 'yearly'],
        'help' => ['priority' => '0.5', 'changefreq' => 'monthly'],
        'privacy' => ['priority' => '0.2', 'changefreq' => 'yearly'],
        'terms' => ['priority' => '0.2', 'changefreq' => 'yearly'],
        'cookies' => ['priority' => '0.2', 'changefreq' => 'yearly'],
        'refund' => ['priority' => '0.2', 'changefreq' => 'yearly'],
    ];

    public function __construct(protected PlatformSettings $settings) {}

    public function enabled(): bool
    {
        return (bool) $this->settings->get('seo.sitemap_enabled', true);
    }

    /**
     * Every URL that should appear, after overrides.
     *
     * @return list<array{path: string, url: string, priority: string, changefreq: string, lastmod: ?string}>
     */
    public function entries(): array
    {
        $host = $this->host();
        $rows = [];

        foreach (self::ROUTES as $name => $hints) {
            $rows[$this->pathFor($name)] = $hints;
        }

        foreach (MarketingController::PRODUCT_SLUGS as $slug) {
            $rows['/products/'.$slug] = ['priority' => '0.8', 'changefreq' => 'monthly'];
        }

        foreach (MarketingController::FEATURE_SLUGS as $slug) {
            $rows['/features/'.$slug] = ['priority' => '0.6', 'changefreq' => 'monthly'];
        }

        foreach (array_merge(MarketingController::SOLUTION_VENUE_SLUGS, MarketingController::SOLUTION_WORKFLOW_SLUGS) as $slug) {
            $rows['/solutions/'.$slug] = ['priority' => '0.7', 'changefreq' => 'monthly'];
        }

        foreach (MarketingController::RESOURCE_SLUGS as $slug) {
            $rows['/resources/'.$slug] = ['priority' => '0.6', 'changefreq' => 'monthly'];
        }

        $landingLastmod = [];

        foreach (MarketingLandingPage::query()->published()->get(['slug', 'published_at']) as $page) {
            $rows['/lp/'.$page->slug] = ['priority' => '0.8', 'changefreq' => 'weekly'];
            $landingLastmod['/lp/'.$page->slug] = $page->published_at?->toDateString();
        }

        $overrides = MarketingSitemapEntry::query()->get()->keyBy('path');

        $entries = [];

        foreach ($rows as $path => $hints) {
            $override = $overrides->get($path);

            if ($override !== null && ! $override->is_enabled) {
                continue;
            }

            $entries[] = [
                'path' => $path,
                'url' => $host.$path,
                'priority' => $override?->priority !== null ? (string) $override->priority : $hints['priority'],
                'changefreq' => $override?->changefreq ?? $hints['changefreq'],
                // Only emitted when actually known: an invented lastmod is worse than none.
                'lastmod' => $override?->lastmod?->toDateString() ?? ($landingLastmod[$path] ?? null),
            ];
        }

        usort($entries, fn (array $a, array $b) => [(float) $b['priority'], $a['path']] <=> [(float) $a['priority'], $b['path']]);

        return $entries;
    }

    public function xml(): string
    {
        return Cache::remember(self::CACHE_KEY, 3600, function () {
            $lines = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ];

            foreach ($this->entries() as $entry) {
                $lines[] = '  <url>';
                $lines[] = '    <loc>'.htmlspecialchars($entry['url'], ENT_XML1).'</loc>';

                if ($entry['lastmod'] !== null) {
                    $lines[] = '    <lastmod>'.$entry['lastmod'].'</lastmod>';
                }

                $lines[] = '    <changefreq>'.$entry['changefreq'].'</changefreq>';
                $lines[] = '    <priority>'.$entry['priority'].'</priority>';
                $lines[] = '  </url>';
            }

            $lines[] = '</urlset>';

            return implode("\n", $lines)."\n";
        });
    }

    public function regenerate(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->settings->set(self::SETTINGS_KEY, now()->toIso8601String(), 'seo');

        // Warm it so the first visitor after a regenerate does not pay for it.
        $this->xml();
    }

    public function lastGeneratedAt(): ?string
    {
        $value = $this->settings->get(self::SETTINGS_KEY);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /** Paths only, for the audit's cross-checks. @return list<string> */
    public function paths(): array
    {
        return array_column($this->entries(), 'path');
    }

    public function host(): string
    {
        $configured = trim((string) ($this->settings->get('seo.canonical_host') ?? ''));

        return rtrim($configured !== '' ? $configured : (string) config('app.url'), '/');
    }

    protected function pathFor(string $routeName): string
    {
        $path = parse_url((string) route($routeName), PHP_URL_PATH);

        return is_string($path) && $path !== '' ? $path : '/';
    }
}
