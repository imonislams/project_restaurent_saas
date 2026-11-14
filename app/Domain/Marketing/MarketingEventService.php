<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\ConsentCategory;
use App\Domain\Marketing\Enums\EventName;
use App\Domain\Marketing\Models\MarketingEvent;
use App\Domain\Marketing\Models\MarketingIntegration;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Jobs\DispatchMarketingEventJob;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Records events into the internal ledger.
 *
 * Two rules shape this service:
 *
 *  1. A client-sourced event is never stored without the consent its category
 *     requires — the request is simply dropped.
 *  2. A server-sourced event is a platform business record (a registration, a
 *     trial, a payment), so it is always stored; what may be *dispatched* to an
 *     advertising provider is gated separately, at dispatch time.
 */
class MarketingEventService
{
    /**
     * Property keys that must never be persisted. Guards against a caller
     * accidentally attaching personal data to an event payload.
     *
     * @var list<string>
     */
    public const BLOCKED_PROPERTY_KEYS = [
        'email', 'phone', 'name', 'first_name', 'last_name', 'full_name',
        'password', 'token', 'secret', 'card', 'card_number', 'cvv', 'address', 'ip',
    ];

    public function __construct(
        protected ConsentService $consent,
        protected VisitorTracker $visitors,
    ) {}

    /**
     * @param  array<string, mixed>  $context  visitor_id, user_id, tenant_id, lead_id,
     *                                         campaign_id, landing_page_id, path, url,
     *                                         referrer, utm_*, value, currency, country,
     *                                         device, channel, occurred_at
     * @param  array<string, mixed>  $properties  non-PII payload
     */
    public function record(
        EventName $name,
        array $context = [],
        array $properties = [],
        ?Request $request = null,
        ?string $eventId = null,
    ): ?MarketingEvent {
        $visitorId = $context['visitor_id'] ?? null;

        if ($request !== null) {
            $visitorId ??= $this->visitors->visitorId($request);

            // Consent is checked before anything is written.
            if (! $this->consent->allows($name->category(), $visitorId)) {
                return null;
            }
        }

        $visitor = $visitorId !== null
            ? MarketingVisitor::query()->where('visitor_id', $visitorId)->first()
            : null;

        $eventId ??= (string) Str::uuid();

        $attributes = array_merge(
            [
                'name' => $name->value,
                'category' => $name->category()->value,
                'source' => $request !== null ? 'client' : 'server',
                'visitor_id' => $visitorId,
                'occurred_at' => $context['occurred_at'] ?? Carbon::now(),
                'properties' => $this->sanitiseProperties($properties),
            ],
            $this->enrich($context, $request, $visitor),
        );

        // firstOrCreate on the stable event_id is the dedupe: a replayed event
        // returns the existing row instead of writing a second one.
        $event = MarketingEvent::query()->firstOrCreate(
            ['event_id' => $eventId],
            $attributes,
        );

        if ($event->wasRecentlyCreated) {
            $this->queueDeliveries($event);
        }

        return $event;
    }

    /**
     * Whether this event may be sent to an advertising platform for this visitor.
     *
     * Consulted at dispatch time — not only when the event is recorded — so a
     * withdrawal of consent stops in-flight delivery.
     */
    public function mayDispatch(MarketingEvent $event): bool
    {
        $category = $event->name->category();

        if (! $category->requiresConsent()) {
            return true;
        }

        return $this->consent->allows($category, $event->visitor_id);
    }

    /**
     * Queue one delivery per provider that is switched on and verified.
     *
     * An integration that has been configured but never proven receives nothing: a
     * connection has to be earned before it is trusted with data.
     */
    public function queueDeliveries(MarketingEvent $event): void
    {
        foreach (MarketingIntegrationRegistry::keys() as $provider) {
            if (! MarketingIntegrationRegistry::dispatchesEvents($provider)) {
                continue;
            }

            $integration = MarketingIntegration::query()->where('provider', $provider)->first();

            if ($integration === null || ! $integration->isOperational()) {
                continue;
            }

            DispatchMarketingEventJob::dispatch($event->getKey(), $provider);
        }
    }

    /**
     * Fill in what the caller did not supply, preferring values captured on the
     * visitor record so a later visit cannot lose its campaign context.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    protected function enrich(array $context, ?Request $request, ?MarketingVisitor $visitor): array
    {
        $utm = $request !== null ? $this->visitors->utmFrom($request) : [];

        $resolved = [];

        foreach (VisitorTracker::UTM_KEYS as $key) {
            $value = $context[$key] ?? $utm[$key] ?? $visitor?->lastTouch()[$this->touchKey($key)] ?? null;

            if ($value !== null && $value !== '') {
                $resolved[$key] = Str::limit((string) $value, 120, '');
            }
        }

        $referrer = $context['referrer'] ?? ($request?->headers->get('referer')) ?? $visitor?->last_referrer;
        // A server-side event has no current page, so it inherits where the visitor
        // was last seen — consistent with how it inherits channel and UTMs.
        $path = $context['path'] ?? ($request !== null ? '/'.$request->path() : $visitor?->last_path);

        $resolved['referrer'] = $referrer !== null ? Str::limit((string) $referrer, 500, '') : null;
        $resolved['path'] = $path !== null ? Str::limit((string) $path, 500, '') : null;
        $resolved['channel'] = ($context['channel'] ?? $visitor?->channel?->value);
        $resolved['device'] = $context['device'] ?? $visitor?->device?->value;
        $resolved['country'] = $context['country'] ?? $visitor?->country;

        foreach (['user_id', 'tenant_id', 'lead_id', 'campaign_id', 'landing_page_id', 'value', 'currency'] as $key) {
            if (array_key_exists($key, $context) && $context[$key] !== null) {
                $resolved[$key] = $context[$key];
            }
        }

        if (isset($resolved['currency'])) {
            $resolved['currency'] = strtoupper((string) $resolved['currency']);
        }

        if ($visitor !== null && ! isset($resolved['user_id']) && $visitor->user_id !== null) {
            $resolved['user_id'] = $visitor->user_id;
        }

        return array_filter($resolved, fn ($value) => $value !== null);
    }

    protected function touchKey(string $utmKey): string
    {
        return match ($utmKey) {
            'utm_source' => 'source',
            'utm_medium' => 'medium',
            'utm_campaign' => 'campaign',
            'utm_term' => 'term',
            'utm_content' => 'content',
            default => $utmKey,
        };
    }

    /**
     * Strip anything that looks like personal data or a nested structure, and cap
     * the payload so an event row cannot be used as a data dump.
     *
     * @param  array<string, mixed>  $properties
     * @return array<string, mixed>
     */
    public function sanitiseProperties(array $properties): array
    {
        $clean = [];

        foreach ($properties as $key => $value) {
            if (in_array(strtolower((string) $key), self::BLOCKED_PROPERTY_KEYS, true)) {
                continue;
            }

            // Nested structures are dropped rather than stored: a flat, scalar
            // payload cannot become a place to hide personal data.
            if (! is_scalar($value) && $value !== null) {
                continue;
            }

            $clean[(string) $key] = is_string($value) ? Str::limit($value, 255, '') : $value;

            if (count($clean) >= 50) {
                break;
            }
        }

        return $clean;
    }

    /**
     * Resolve the event category a name belongs to, for callers that need it
     * before recording.
     */
    public function categoryFor(EventName $name): ConsentCategory
    {
        return $name->category();
    }
}
