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

        return ['content' => $this->staticFile('sitemap.xml'), 'source' => 'static'];
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

        return ['content' => $this->staticFile('robots.txt'), 'source' => 'static'];
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
