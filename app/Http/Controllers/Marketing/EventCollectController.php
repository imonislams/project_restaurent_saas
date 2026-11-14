<?php

namespace App\Http\Controllers\Marketing;

use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\MarketingEventService;
use App\Domain\Marketing\VisitorTracker;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Client-side event ingestion for the public site.
 *
 * The endpoint is unauthenticated, so it is deliberately narrow: only catalogued
 * event names are accepted, the visitor is resolved from the first-party cookie
 * rather than from the payload (a client cannot attribute an event to someone
 * else's timeline), and the service drops anything for which consent is absent.
 */
class EventCollectController extends Controller
{
    public function __invoke(
        Request $request,
        MarketingEventService $events,
        VisitorTracker $tracker,
    ): JsonResponse {
        $data = $request->validate([
            'name' => ['required', 'string', Rule::in(EventName::values())],
            'event_id' => ['nullable', 'uuid'],
            'path' => ['nullable', 'string', 'max:500'],
            'url' => ['nullable', 'string', 'max:500'],
            'referrer' => ['nullable', 'string', 'max:500'],
            'properties' => ['nullable', 'array', 'max:50'],
        ]);

        $event = $events->record(
            EventName::from($data['name']),
            [
                'visitor_id' => $tracker->visitorId($request),
                'path' => $data['path'] ?? null,
                'url' => $data['url'] ?? null,
                'referrer' => $data['referrer'] ?? null,
                'user_id' => $request->user()?->getKey(),
            ],
            (array) ($data['properties'] ?? []),
            $request,
            $data['event_id'] ?? null,
        );

        // A null result means consent was absent. That is a successful, intentional
        // no-op rather than an error, so it is reported as accepted-but-not-stored.
        return response()->json(
            ['stored' => $event !== null],
            $event === null ? 202 : 201,
        );
    }
}
