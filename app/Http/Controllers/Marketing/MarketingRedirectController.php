<?php

namespace App\Http\Controllers\Marketing;

use App\Domain\Marketing\Seo\RedirectService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Applies admin-managed redirects to paths that no route matched.
 *
 * Registered as the framework fallback, so it only ever sees a request that would
 * otherwise be a 404. The chain was validated on save and is walked again here with a
 * depth guard, so a cycle that somehow reached the database cannot hang a browser.
 */
class MarketingRedirectController extends Controller
{
    public function __invoke(Request $request, RedirectService $redirects): RedirectResponse
    {
        abort_unless($request->isMethod('GET') || $request->isMethod('HEAD'), 404);

        $path = '/'.ltrim($request->path(), '/');
        $match = $redirects->resolve($path);

        abort_if($match === null, 404);

        $redirects->recordHit($match['redirect']);

        return $redirects->isInternal($match['to'])
            ? redirect($match['to'], $match['code'])
            : redirect()->away($match['to'], $match['code']);
    }
}
