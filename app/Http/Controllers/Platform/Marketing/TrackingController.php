<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\MarketingIntegrationService;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingEventDelivery;
use App\Domain\Marketing\Models\MarketingSyncLog;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tracking configuration and the event ledger.
 *
 * Every screen distinguishes three things the old code conflated: what is
 * configured, what has been *verified*, and what data has actually arrived. Nothing
 * is displayed as live unless a sync or a delivery put it there.
 */
class TrackingController extends Controller
{
    public function __construct(
        protected MarketingIntegrationService $integrations,
        protected PlatformSettings $settings,
    ) {}

    public function pixels(): Response
    {
        return Inertia::render('Platform/Marketing/Tracking/Pixels', [
            'meta_pixel' => $this->integrations->row('meta_pixel'),
            'meta_conversions' => $this->integrations->row('meta_conversions'),
            'catalogue' => $this->catalogue(),
            'deliveries' => $this->recentDeliveries('meta_conversions'),
        ]);
    }

    public function google(): Response
    {
        $snapshot = $this->integrations->snapshot('google_analytics', 'ga4_snapshot');

        return Inertia::render('Platform/Marketing/Tracking/Google', [
            'analytics' => $this->integrations->row('google_analytics'),
            'tag_manager' => $this->integrations->row('google_tag_manager'),
            'snapshot' => $snapshot,
            'syncs' => $this->recentSyncs('google_analytics'),
        ]);
    }

    public function searchConsole(): Response
    {
        return Inertia::render('Platform/Marketing/Tracking/SearchConsole', [
            'integration' => $this->integrations->row('search_console'),
            'snapshot' => $this->integrations->snapshot('search_console', 'gsc_snapshot'),
            'syncs' => $this->recentSyncs('search_console'),
        ]);
    }

    public function googleAds(): Response
    {
        return Inertia::render('Platform/Marketing/Tracking/GoogleAds', [
            'integration' => $this->integrations->row('google_ads'),
            'snapshot' => $this->integrations->snapshot('google_ads', 'ads_snapshot'),
            'syncs' => $this->recentSyncs('google_ads'),
        ]);
    }

    public function events(Request $request): Response
    {
        $filters = [
            'name' => (string) $request->string('name'),
            'source' => (string) $request->string('source'),
            'status' => (string) $request->string('status'),
            'search' => (string) $request->string('search'),
        ];

        $query = MarketingEvent::query()->latest('occurred_at');

        if ($filters['name'] !== '') {
            $query->where('name', $filters['name']);
        }

        if (in_array($filters['source'], ['client', 'server'], true)) {
            $query->where('source', $filters['source']);
        }

        if ($filters['status'] === 'undelivered') {
            $query->whereDoesntHave('deliveries', fn ($delivery) => $delivery->where('status', 'sent'));
        } elseif (in_array($filters['status'], ['sent', 'failed', 'skipped', 'pending'], true)) {
            $query->whereHas('deliveries', fn ($delivery) => $delivery->where('status', $filters['status']));
        }

        if ($filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(fn ($inner) => $inner
                ->where('path', 'like', '%'.$search.'%')
                ->orWhere('utm_campaign', 'like', '%'.$search.'%')
                ->orWhere('event_id', 'like', '%'.$search.'%'));
        }

        return Inertia::render('Platform/Marketing/Tracking/Events', [
            'events' => $query->with(['deliveries', 'campaign:id,name', 'lead:id,name'])
                ->paginate(25)
                ->withQueryString()
                ->through(fn (MarketingEvent $event) => [
                    'id' => $event->getKey(),
                    'event_id' => $event->event_id,
                    'name' => $event->name->value,
                    'label' => $event->name->label(),
                    'category' => $event->category->value,
                    'source' => $event->source,
                    'occurred_at' => $event->occurred_at?->toIso8601String(),
                    'path' => $event->path,
                    'channel' => $event->channel?->value,
                    'utm_campaign' => $event->utm_campaign,
                    'campaign' => $event->campaign?->name,
                    'lead' => $event->lead?->name,
                    'value' => $event->value !== null ? (float) $event->value : null,
                    'currency' => $event->currency,
                    'deliveries' => $event->deliveries->map(fn (MarketingEventDelivery $delivery) => [
                        'provider' => $delivery->provider,
                        'status' => $delivery->status,
                        'attempts' => $delivery->attempts,
                        'http_status' => $delivery->http_status,
                        'error' => $delivery->error,
                        'sent_at' => $delivery->sent_at?->toIso8601String(),
                    ])->values(),
                ]),
            'filters' => $filters,
            'options' => [
                'names' => collect(EventName::cases())->map(fn (EventName $name) => [
                    'value' => $name->value,
                    'label' => $name->label(),
                ])->values(),
            ],
            'counts' => [
                'total' => MarketingEvent::query()->count(),
                'today' => MarketingEvent::query()->where('occurred_at', '>=', now()->startOfDay())->count(),
                'with_deliveries' => MarketingEventDelivery::query()->count(),
                'failed' => MarketingEventDelivery::query()->where('status', 'failed')->count(),
            ],
        ]);
    }

    public function preferences(): Response
    {
        return Inertia::render('Platform/Marketing/Tracking/Preferences', [
            'settings' => [
                'tracking_enabled' => (bool) $this->settings->get('marketing.tracking_enabled', true),
                'attribution_model' => (string) $this->settings->get('marketing.attribution_model', 'last_touch'),
                'attribution_window_days' => (int) $this->settings->get('marketing.attribution_window_days', 30),
                'exclude_internal' => (bool) $this->settings->get('marketing.exclude_internal', true),
                'enabled_events' => $this->settings->get('marketing.enabled_events'),
            ],
            'catalogue' => $this->catalogue(),
        ]);
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'tracking_enabled' => ['required', 'boolean'],
            'attribution_model' => ['required', 'string', 'in:first_touch,last_touch'],
            'attribution_window_days' => ['required', 'integer', 'min:1', 'max:365'],
            'exclude_internal' => ['required', 'boolean'],
            'enabled_events' => ['nullable', 'array'],
            'enabled_events.*' => ['string', 'in:'.implode(',', EventName::values())],
        ]);

        foreach ([
            'marketing.tracking_enabled' => (bool) $data['tracking_enabled'],
            'marketing.attribution_model' => $data['attribution_model'],
            'marketing.attribution_window_days' => (int) $data['attribution_window_days'],
            'marketing.exclude_internal' => (bool) $data['exclude_internal'],
            'marketing.enabled_events' => array_values((array) ($data['enabled_events'] ?? [])),
        ] as $key => $value) {
            $this->settings->set($key, $value, 'marketing');
        }

        app(AuditLogger::class)->log('marketing.tracking_preferences_updated', null, [
            'attribution_model' => $data['attribution_model'],
            'window_days' => (int) $data['attribution_window_days'],
            'enabled_events' => count((array) ($data['enabled_events'] ?? [])),
        ], $request->user());

        return back()->with('success', 'Tracking preferences saved.');
    }

    /**
     * Send a synthetic event so an operator can prove the pipe end-to-end.
     */
    public function testEvent(Request $request, string $provider): RedirectResponse
    {
        $result = $this->integrations->sendTestEvent($provider, $request->user());

        if ($result['ok'] ?? false) {
            return back()->with('success', 'Test event accepted by '.$provider.'. Check the provider\'s own test-event view to confirm it arrived.');
        }

        return back()->with('error', (string) ($result['error'] ?? 'The test event was not accepted.'));
    }

    /**
     * The tracked-event catalog with its category and Meta mapping, so the mapping
     * table on the screen is generated from the code rather than kept by hand.
     *
     * @return list<array<string, mixed>>
     */
    protected function catalogue(): array
    {
        return collect(EventName::cases())
            ->map(fn (EventName $name) => [
                'value' => $name->value,
                'label' => $name->label(),
                'category' => $name->category()->value,
                'meta_event' => $name->metaEventName(),
                'monetary' => $name->isMonetary(),
            ])
            ->values()
            ->all();
    }

    /** @return list<array<string, mixed>> */
    protected function recentDeliveries(string $provider): array
    {
        return MarketingEventDelivery::query()
            ->with('event:id,name,event_id,occurred_at')
            ->where('provider', $provider)
            ->latest('id')
            ->limit(15)
            ->get()
            ->map(fn (MarketingEventDelivery $delivery) => [
                'event' => $delivery->event?->name?->value,
                'event_id' => $delivery->external_event_id,
                'status' => $delivery->status,
                'attempts' => $delivery->attempts,
                'http_status' => $delivery->http_status,
                'error' => $delivery->error,
                'sent_at' => $delivery->sent_at?->toIso8601String(),
                'created_at' => $delivery->created_at?->toIso8601String(),
            ])
            ->all();
    }

    /** @return list<array<string, mixed>> */
    protected function recentSyncs(string $provider): array
    {
        $integration = $this->integrations->forProvider($provider);

        if ($integration === null) {
            return [];
        }

        return MarketingSyncLog::query()
            ->where('integration_id', $integration->getKey())
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (MarketingSyncLog $log) => [
                'entity' => $log->entity,
                'status' => $log->status,
                'items' => $log->items_count,
                'error' => $log->error,
                'started_at' => $log->started_at?->toIso8601String(),
                'duration_ms' => $log->duration_ms,
            ])
            ->all();
    }
}
