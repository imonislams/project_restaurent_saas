<?php

namespace App\Http\Controllers\Marketing;

use App\Domain\Marketing\ConsentService;
use App\Domain\Marketing\VisitorTracker;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\Rule;

/**
 * Records a consent decision from the banner or the preference centre.
 *
 * Appends to the consent history rather than overwriting it, and returns the
 * effective categories so the UI settles without a reload — a reload would record a
 * second page view and make the metrics lie.
 */
class ConsentController extends Controller
{
    public function __invoke(
        Request $request,
        ConsentService $consent,
        VisitorTracker $tracker,
    ): JsonResponse {
        $data = $request->validate([
            'categories' => ['required', 'array'],
            'categories.essential' => ['nullable', 'boolean'],
            'categories.analytics' => ['nullable', 'boolean'],
            'categories.advertising' => ['nullable', 'boolean'],
            'action' => ['nullable', 'string', Rule::in(['granted', 'updated', 'withdrawn'])],
        ]);

        $visitorId = $tracker->visitorId($request);

        if ($visitorId === null) {
            $visitorId = $tracker->newVisitorId();

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

        $record = $consent->record(
            $data['categories'],
            $visitorId,
            $data['action'] ?? null,
            $request,
            'banner',
            $request->user(),
        );

        return response()->json([
            'granted' => $record->categories,
            'version' => $record->version,
        ]);
    }
}
