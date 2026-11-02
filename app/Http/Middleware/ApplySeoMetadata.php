<?php

namespace App\Http\Middleware;

use App\Domain\Marketing\Seo\SeoService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Publishes the resolved SEO metadata as a shared Inertia prop.
 *
 * The root Blade template reads the same prop out of the page object and renders it
 * into <head> server-side, so a crawler that runs no JavaScript still sees real
 * metadata. Fail-safe: a problem resolving metadata must never break a page render.
 */
class ApplySeoMetadata
{
    public function __construct(protected SeoService $seo) {}

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $metadata = $this->seo->forRequest($request);

            if ($metadata !== null) {
                Inertia::share('seo', $metadata);
            }
        } catch (\Throwable $e) {
            // Fail-safe, but not silent — a broken SEO lookup should be visible in
            // the log rather than looking exactly like "no metadata configured".
            Log::warning('SEO metadata could not be resolved.', [
                'path' => $request->path(),
                'error' => $e->getMessage(),
            ]);
        }

        return $next($request);
    }
}
