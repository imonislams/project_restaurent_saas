<?php

namespace App\Domain\Marketing\Seo;

use App\Domain\Marketing\Models\MarketingRedirect;

/**
 * Technical SEO audit.
 *
 * It inspects the metadata this platform actually generates for each public route —
 * not a crawled HTML snapshot — so it costs nothing, runs anywhere, and tells the
 * truth about what a crawler will be served. The screen says so explicitly; a report
 * labelled "audit" must not imply a network crawl it never performed.
 */
class SeoAuditService
{
    public const TITLE_MIN = 15;

    public const TITLE_MAX = 65;

    public const DESCRIPTION_MIN = 50;

    public const DESCRIPTION_MAX = 165;

    public function __construct(
        protected SeoService $seo,
        protected SitemapService $sitemap,
    ) {}

    /**
     * @return array{
     *     findings: list<array{severity: string, code: string, message: string, path: string|null}>,
     *     checked: int,
     *     summary: array{errors: int, warnings: int, info: int},
     *     generated_at: string
     * }
     */
    public function audit(): array
    {
        $findings = [];
        $titles = [];
        $descriptions = [];
        $sitemapPaths = $this->sitemap->paths();

        $routes = array_keys(SitemapService::ROUTES);

        foreach ($routes as $routeName) {
            $meta = $this->seo->forRoute($routeName, $this->canonicalFor($routeName));
            $path = $this->pathFor($routeName);

            $title = trim((string) $meta['title']);
            $description = trim((string) $meta['description']);

            if ($title === '') {
                $findings[] = $this->finding('error', 'title_missing', 'This page has no title.', $path);
            } elseif (mb_strlen($title) < self::TITLE_MIN) {
                $findings[] = $this->finding('warning', 'title_short', 'The title is '.(mb_strlen($title)).' characters; aim for '.self::TITLE_MIN.'–'.self::TITLE_MAX.'.', $path);
            } elseif (mb_strlen($title) > self::TITLE_MAX) {
                $findings[] = $this->finding('warning', 'title_long', 'The title is '.(mb_strlen($title)).' characters and will be truncated after about '.self::TITLE_MAX.'.', $path);
            }

            if ($description === '') {
                $findings[] = $this->finding('error', 'description_missing', 'This page has no meta description.', $path);
            } elseif (mb_strlen($description) < self::DESCRIPTION_MIN) {
                $findings[] = $this->finding('warning', 'description_short', 'The description is '.(mb_strlen($description)).' characters; aim for '.self::DESCRIPTION_MIN.'–'.self::DESCRIPTION_MAX.'.', $path);
            } elseif (mb_strlen($description) > self::DESCRIPTION_MAX) {
                $findings[] = $this->finding('warning', 'description_long', 'The description is '.(mb_strlen($description)).' characters and will be truncated.', $path);
            }

            if (preg_match('#^https?://#i', (string) $meta['canonical']) !== 1) {
                $findings[] = $this->finding('error', 'canonical_relative', 'The canonical URL is not absolute.', $path);
            } elseif (! str_starts_with((string) $meta['canonical'], $this->sitemap->host())) {
                $findings[] = $this->finding('warning', 'canonical_host', 'The canonical points at a different host than the configured canonical host.', $path);
            }

            if (str_contains(strtolower((string) $meta['robots']), 'noindex')) {
                $findings[] = $this->finding('error', 'robots_noindex', 'A public page is set to noindex, so search engines will drop it.', $path);
            }

            if (! in_array($path, $sitemapPaths, true)) {
                $findings[] = $this->finding('warning', 'sitemap_missing', 'This page is not in the generated sitemap.', $path);
            }

            $titles[$title][] = $path;
            $descriptions[$description][] = $path;
        }

        foreach ($titles as $title => $paths) {
            if ($title !== '' && count($paths) > 1) {
                $findings[] = $this->finding('warning', 'duplicate_title', 'The same title is used on '.count($paths).' pages: '.implode(', ', $paths).'.', null);
            }
        }

        foreach ($descriptions as $description => $paths) {
            if ($description !== '' && count($paths) > 1) {
                $findings[] = $this->finding('warning', 'duplicate_description', 'The same description is used on '.count($paths).' pages: '.implode(', ', $paths).'.', null);
            }
        }

        // A redirect that shadows a live route will never fire — the route wins.
        foreach (MarketingRedirect::query()->active()->get() as $redirect) {
            if (in_array($redirect->from_path, $sitemapPaths, true)) {
                $findings[] = $this->finding(
                    'warning',
                    'redirect_shadowed',
                    'A redirect starts at a live page ('.$redirect->from_path.'), so it can never fire.',
                    $redirect->from_path,
                );
            }
        }

        if (! $this->sitemap->enabled()) {
            $findings[] = $this->finding('info', 'sitemap_disabled', 'Sitemap generation is switched off; the static public/sitemap.xml is being served instead.', null);
        }

        if (($home = $this->seo->forRoute('home', $this->canonicalFor('home'))) && empty($home['schema'])) {
            $findings[] = $this->finding('warning', 'schema_missing', 'The homepage emits no structured data.', '/');
        }

        $summary = ['errors' => 0, 'warnings' => 0, 'info' => 0];

        foreach ($findings as $finding) {
            $summary[$finding['severity'].'s'] = ($summary[$finding['severity'].'s'] ?? 0) + 1;
        }

        // Errors first, then warnings, then informational notes.
        $order = ['error' => 0, 'warning' => 1, 'info' => 2];
        usort($findings, fn (array $a, array $b) => $order[$a['severity']] <=> $order[$b['severity']]);

        return [
            'findings' => $findings,
            'checked' => count($routes),
            'summary' => $summary,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /** @return array{severity: string, code: string, message: string, path: string|null} */
    protected function finding(string $severity, string $code, string $message, ?string $path): array
    {
        return compact('severity', 'code', 'message', 'path');
    }

    protected function pathFor(string $routeName): string
    {
        $path = parse_url((string) route($routeName), PHP_URL_PATH);

        return is_string($path) && $path !== '' ? $path : '/';
    }

    protected function canonicalFor(string $routeName): string
    {
        return $this->sitemap->host().$this->pathFor($routeName);
    }
}
