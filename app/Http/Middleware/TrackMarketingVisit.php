<?php

namespace App\Http\Middleware;

use App\Domain\Marketing\MarketingEventService;
use App\Domain\Marketing\Seo\SeoService;
use App\Domain\Marketing\VisitorTracker;
use App\Domain\Marketing\Enums\EventName;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Issues the first-party visitor id and records the page view.
 *
 * Three deliberate limits:
 *
 *  - only the initial HTML load is tracked; Inertia navigations are client-side and
 *    report themselves through the ingestion endpoint, so a view is never counted twice;
 *  - platform-admin traffic is skipped, so internal use does not pollute the metrics;
 *  - the body is wrapped, because marketing is a secondary concern and must never
 *    break a page render — but a failure is logged rather than silently swallowed.
 */
class TrackMarketingVisit
{
    public function __construct(
        protected VisitorTracker $tracker,
        protected MarketingEventService $events,
        protected \App\Domain\Marketing\ConsentService $consent,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $visitorId = null;

        if ($this->shouldTrack($request)) {
            try {
                // A visitor is only ever created by the consent endpoint, and only an
                // existing id with analytics consent is tracked here. A GET therefore
                // never hands out an identifier: the first page a visitor sees stores
                // nothing about them at all. Attribution consequently requires consent,
                // which is the correct trade.
                $existing = $this->tracker->visitorId($request);

                if ($existing !== null && $this->consent->allows(\App\Domain\Marketing\Enums\ConsentCategory::Analytics, $existing)) {
                    $visitorId = $existing;

                    $this->tracker->track($request, $visitorId, '/'.$request->path());

                    // Refreshed so an active visitor's cookie does not lapse mid-visit.
                    Cookie::queue(Cookie::make(
                        VisitorTracker::COOKIE,
                        $visitorId,
                        VisitorTracker::LIFETIME_MINUTES,
                        '/',
                        null,
                        $request->isSecure(),
                        false,
                        'lax',
                    ));
                }
            } catch (\Throwable $e) {
                $visitorId = null;

                Log::warning('Marketing visit could not be tracked.', [
                    'path' => $request->path(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $response = $next($request);

        // Recorded after the response is built, so a slow write cannot delay the page.
        // Consent is enforced inside record() as well, which simply drops the event.
        if ($visitorId !== null) {
            try {
                $this->events->record(EventName::PageView, ['visitor_id' => $visitorId], [], $request);
            } catch (\Throwable $e) {
                Log::warning('Marketing page view could not be recorded.', [
                    'path' => $request->path(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $response;
    }

    protected function shouldTrack(Request $request): bool
    {
        if (! $request->isMethod('GET')) {
            return false;
        }

        // An Inertia navigation is a client-side visit; the browser reports it.
        if ($request->header('X-Inertia') !== null) {
            return false;
        }

        if ($request->header('X-Requested-With') === 'XMLHttpRequest') {
            return false;
        }

        // Only the public marketing site is tracked, never the platform or tenant
        // workspace — the whitelist excludes both by construction.
        if (! $this->isPublicRoute($request)) {
            return false;
        }

        return $this->tracker->shouldTrack($request);
    }

    protected function isPublicRoute(Request $request): bool
    {
        $routeName = $request->route()?->getName();

        return is_string($routeName) && in_array($routeName, SeoService::PUBLIC_ROUTE_NAMES, true);
    }
}
