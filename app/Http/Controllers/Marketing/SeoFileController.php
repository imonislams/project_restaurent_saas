<?php

namespace App\Http\Controllers\Marketing;

use App\Domain\Marketing\Seo\SeoSiteFiles;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * Serves the generated sitemap and robots.txt.
 *
 * Both fall back to the static files in `public/` when generation is switched off or
 * fails, so the site always answers with a valid document rather than a 500 — and a
 * rollback restores the previous behaviour without touching the web server.
 */
class SeoFileController extends Controller
{
    public function sitemap(SeoSiteFiles $files): Response
    {
        $result = $files->sitemap();

        return response($result['content'], 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'X-Robots-Tag' => 'noindex',
            'X-Sitemap-Source' => $result['source'],
        ]);
    }

    public function robots(SeoSiteFiles $files): Response
    {
        $result = $files->robots();

        return response($result['content'], 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'X-Robots-Source' => $result['source'],
        ]);
    }
}
