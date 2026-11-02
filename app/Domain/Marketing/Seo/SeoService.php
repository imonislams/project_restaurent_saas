<?php

namespace App\Domain\Marketing\Seo;

use App\Domain\Marketing\Models\MarketingSeoMeta;
use App\Domain\PlatformSettings\PlatformSettings;
use Illuminate\Http\Request;

/**
 * Resolves the metadata for a public page.
 *
 * The values are emitted twice on purpose: server-side into the root Blade template,
 * so a crawler that runs no JavaScript still sees a real title, description,
 * canonical and Open Graph block; and as an Inertia prop, so client-side navigation
 * keeps the same tags. Both paths read this one method, so they cannot drift.
 *
 * A stored row overrides fields individually — a NULL column means "inherit", which
 * is what makes it impossible to leave a page without metadata.
 */
class SeoService
{
    /** Route names that carry public marketing metadata. */
    public const PUBLIC_ROUTE_NAMES = [
        'home',
        'products.index', 'products.show',
        'features.index', 'features.show',
        'solutions.index', 'solutions.show',
        'pricing', 'about', 'contact',
        'resources.index', 'resources.show',
        'help', 'privacy', 'terms', 'cookies', 'refund',
        'lp.show',
    ];

    public const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    public function __construct(protected PlatformSettings $settings) {}

    /**
     * Metadata for a request, or null when the route is not a public page.
     *
     * @return array<string, mixed>|null
     */
    public function forRequest(Request $request): ?array
    {
        $routeName = $request->route()?->getName();

        if (! is_string($routeName) || ! in_array($routeName, self::PUBLIC_ROUTE_NAMES, true)) {
            return null;
        }

        return $this->forRoute($routeName, $request->url());
    }

    /**
     * @return array<string, mixed>
     */
    public function forRoute(string $routeName, ?string $canonicalUrl = null): array
    {
        $brand = $this->brand();
        $overrides = MarketingSeoMeta::query()->forRoute($routeName)->first()?->overrides() ?? [];

        $title = $overrides['title'] ?? $this->pageTitle($routeName);
        $description = $overrides['description'] ?? (string) ($this->settings->get('seo.default_description')
            ?? 'Restaurant management software for dine-in, takeaway, delivery and multi-branch restaurants.');
        $canonical = $overrides['canonical'] ?? $canonicalUrl ?? $this->canonicalHost().'/';
        $image = $overrides['og_image'] ?? (string) ($this->settings->get('seo.default_og_image') ?? '/icon-512.png');
        $robots = $overrides['robots'] ?? self::INDEX_ROBOTS;

        $ogTitle = $overrides['og_title'] ?? $title;
        $ogDescription = $overrides['og_description'] ?? $description;

        return [
            'route' => $routeName,
            'title' => $title,
            'full_title' => $title.' - '.$brand,
            'description' => $description,
            'canonical' => $canonical,
            'robots' => $robots,
            'brand' => $brand,
            'og' => [
                'title' => $ogTitle.' - '.$brand,
                'description' => $ogDescription,
                'type' => $overrides['og_type'] ?? 'website',
                'url' => $canonical,
                'image' => $this->absolute($image),
                'site_name' => $brand,
            ],
            'twitter' => [
                'card' => $overrides['twitter_card'] ?? 'summary_large_image',
                'title' => $ogTitle.' - '.$brand,
                'description' => $ogDescription,
                'image' => $this->absolute($image),
            ],
            'schema' => $overrides['schema'] ?? $this->defaultSchema($routeName, $brand, $description, $canonical),
            'verification' => array_filter([
                'google' => $this->settings->get('seo.google_verification'),
            ]),
        ];
    }

    /**
     * Settings-backed defaults, so the SEO screen in Phase 3 edits real values rather
     * than a parallel copy of them.
     *
     * @return array<string, mixed>
     */
    public function defaults(): array
    {
        return [
            'brand' => $this->brand(),
            'default_title' => (string) ($this->settings->get('seo.default_title') ?? config('app.name')),
            'default_description' => (string) ($this->settings->get('seo.default_description') ?? ''),
            'default_og_image' => (string) ($this->settings->get('seo.default_og_image') ?? '/icon-512.png'),
            'canonical_host' => $this->canonicalHost(),
            'robots' => self::INDEX_ROBOTS,
        ];
    }

    /**
     * The pages the SEO editor lists: the route's path, what it currently resolves to,
     * and whether that came from a stored override or an inherited default.
     *
     * @param  list<string>  $routeNames
     * @return list<array<string, mixed>>
     */
    public function editablePages(array $routeNames): array
    {
        $rows = [];

        foreach ($routeNames as $routeName) {
            $path = parse_url((string) route($routeName), PHP_URL_PATH) ?: '/';
            $stored = MarketingSeoMeta::query()->forRoute($routeName)->first();
            $resolved = $this->forRoute($routeName, $this->canonicalHost().$path);

            $rows[] = [
                'route' => $routeName,
                'path' => $path,
                'title' => $resolved['title'],
                'description' => $resolved['description'],
                'canonical' => $resolved['canonical'],
                'robots' => $resolved['robots'],
                'og_title' => $resolved['og']['title'],
                'og_description' => $resolved['og']['description'],
                'og_image' => $resolved['og']['image'],
                'has_override' => $stored !== null,
                'is_auto' => $stored?->is_auto ?? true,
                'updated_at' => $stored?->updated_at?->toIso8601String(),
            ];
        }

        return $rows;
    }

    /**
     * Save a page's overrides. A blank field clears the override so the page inherits
     * the default again — which is how a page can never end up with no metadata.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateRouteMeta(string $routeName, array $data): MarketingSeoMeta
    {
        $path = parse_url((string) route($routeName), PHP_URL_PATH) ?: '/';

        $clean = fn (?string $value): ?string => ($value === null || trim($value) === '') ? null : trim($value);

        return MarketingSeoMeta::query()->updateOrCreate(
            ['route_key' => $routeName],
            [
                'path' => $path,
                'title' => $clean($data['title'] ?? null),
                'description' => $clean($data['description'] ?? null),
                'canonical' => $clean($data['canonical'] ?? null),
                'og_title' => $clean($data['og_title'] ?? null),
                'og_description' => $clean($data['og_description'] ?? null),
                'og_image' => $clean($data['og_image'] ?? null),
                'og_type' => $clean($data['og_type'] ?? null),
                'robots' => $clean($data['robots'] ?? null),
                'is_auto' => false,
                'updated_by' => isset($data['updated_by']) ? (int) $data['updated_by'] : null,
            ],
        );
    }

    /**
     * The site's own name, used for the title suffix and organisation schema.
     */
    protected function brand(): string
    {
        $configured = $this->settings->get('general.platform_name');
        $branding = $this->settings->get('branding.tagline');

        return (string) ($configured ?: config('app.name', 'Laravel')) ?: (string) $branding;
    }

    public function canonicalHost(): string
    {
        $configured = trim((string) ($this->settings->get('seo.canonical_host') ?? ''));

        return rtrim($configured !== '' ? $configured : (string) config('app.url'), '/');
    }

    protected function absolute(string $path): string
    {
        if (preg_match('#^https?://#i', $path) === 1) {
            return $path;
        }

        return $this->canonicalHost().'/'.ltrim($path, '/');
    }

    /**
     * A sensible per-page title when no editor has overridden it.
     */
    protected function pageTitle(string $routeName): string
    {
        return match ($routeName) {
            'home' => (string) ($this->settings->get('seo.default_title')
                ?? 'Complete Restaurant Management Software & POS'),
            'pricing' => 'Pricing & Plans',
            'products.index' => 'Products',
            'features.index' => 'Features',
            'solutions.index' => 'Solutions',
            'about' => 'About us',
            'contact' => 'Contact & demo requests',
            'resources.index' => 'Guides & resources',
            'help' => 'Help centre',
            'privacy' => 'Privacy policy',
            'terms' => 'Terms of service',
            'cookies' => 'Cookie policy',
            'refund' => 'Refund policy',
            'lp.show' => (string) ($this->settings->get('seo.default_title') ?? config('app.name')),
            default => ucfirst(str_replace(['.', '-', '_'], ' ', $routeName)),
        };
    }

    /**
     * Organisation and WebSite schema on the homepage; nothing invented elsewhere.
     *
     * @return list<array<string, mixed>>
     */
    protected function defaultSchema(string $routeName, string $brand, string $description, string $canonical): array
    {
        if ($routeName !== 'home') {
            return [];
        }

        $supportEmail = $this->settings->get('general.support_email');

        return [
            [
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                'name' => $brand,
                'url' => $this->canonicalHost(),
                'description' => $description,
                ...($supportEmail ? ['email' => (string) $supportEmail] : []),
            ],
            [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $brand,
                'url' => $canonical,
            ],
        ];
    }
}
