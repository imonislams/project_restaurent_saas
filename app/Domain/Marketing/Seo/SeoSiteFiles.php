<?php

namespace App\Domain\Marketing\Seo;

use App\Domain\PlatformSettings\PlatformSettings;

/**
 * Serves the generated sitemap and robots.txt, with the existing static files as a
 * fallback.
 *
 * The fallback matters: if generation is switched off, or something goes wrong, the
 * site must keep serving a valid file rather than a 500 or an empty response. That is
 * also what makes the rollback story true — the static files are still there.
 */
class SeoSiteFiles
{
    public function __construct(
        protected SitemapService $sitemap,
        protected RobotsService $robots,
        protected PlatformSettings $settings,
    ) {}

    /** @return array{content: string, source: string} */
    public function sitemap(): array
    {
        if ($this->sitemap->enabled()) {
            try {
                return ['content' => $this->sitemap->xml(), 'source' => 'generated'];
            } catch (\Throwable $e) {
                report($e);
            }
        }

        // Generation is off (or failed). Prefer a checked-in static document, but
        // never answer with an empty body: an empty 200 is worse for a crawler than
        // no file at all, because it looks like a valid but empty sitemap. Fall back
        // to the generated document, which is still valid XML and still correct.
        $static = $this->staticFile('sitemap.xml');

        if ($static !== '') {
            return ['content' => $static, 'source' => 'static'];
        }

        return $this->sitemapFallback();
    }

    /** @return array{content: string, source: string} */
    protected function sitemapFallback(): array
    {
        try {
            return ['content' => $this->sitemap->xml(), 'source' => 'generated'];
        } catch (\Throwable $e) {
            report($e);

            // Last resort: a minimal, valid document so crawlers get an answer.
            return [
                'content' => '<?xml version="1.0" encoding="UTF-8"?>'."\n"
                    .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'."\n",
                'source' => 'empty',
            ];
        }
    }

    /** @return array{content: string, source: string} */
    public function robots(): array
    {
        if ($this->robots->enabled()) {
            try {
                return ['content' => $this->robots->content(), 'source' => $this->robots->isCustom() ? 'custom' : 'generated'];
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $static = $this->staticFile('robots.txt');

        if ($static !== '') {
            return ['content' => $static, 'source' => 'static'];
        }

        // An EMPTY robots.txt is not neutral: it disallows nothing, so /platform,
        // /pos, /webhooks and every other private area become crawlable. Never
        // answer with an empty body — fall back to the generated rules.
        try {
            return ['content' => $this->robots->defaultContent(), 'source' => 'generated'];
        } catch (\Throwable $e) {
            report($e);

            // Last resort: deny everything rather than silently allow it.
            return ['content' => "User-agent: *\nDisallow: /\n", 'source' => 'deny-all'];
        }
    }

    /**
     * The fallback document.
     *
     * It lives in storage, not in public/: a physical `public/sitemap.xml` is served
     * by the web server before the request ever reaches Laravel, so the generated file
     * would never have been reached. The public/ lookup stays as a last resort for an
     * install that still has the legacy files in place.
     */
    protected function staticFile(string $name): string
    {
        $candidates = [
            storage_path('app/seo/'.str_replace('.', '.static.', $name)),
            public_path($name),
        ];

        foreach ($candidates as $path) {
            if (is_file($path)) {
                return (string) file_get_contents($path);
            }
        }

        return '';
    }
}
