<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\DeviceCategory;
use App\Domain\Marketing\Enums\MarketingChannel;
use App\Domain\Marketing\Models\MarketingVisitor;
use App\Domain\Marketing\Support\IpHasher;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Resolves and maintains the first-party visitor record behind the md_vid cookie.
 *
 * This is not an advertising identifier: it is first-party, server-readable and
 * disclosed in the cookie policy as part of this work.
 */
class VisitorTracker
{
    public const COOKIE = 'md_vid';

    /** ~13 months, in minutes. */
    public const LIFETIME_MINUTES = 60 * 24 * 400;

    /** The UTM parameters captured from a request. @var list<string> */
    public const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    public function cookieName(): string
    {
        return self::COOKIE;
    }

    /** The visitor id already present on the request, if any. */
    public function visitorId(Request $request): ?string
    {
        $value = $request->cookie(self::COOKIE);

        if (! is_string($value) || ! Str::isUuid($value)) {
            return null;
        }

        return $value;
    }

    public function newVisitorId(): string
    {
        return (string) Str::uuid();
    }

    /**
     * Internal traffic must not appear in marketing metrics, so a signed-in
     * platform admin is never tracked. Bots are still recorded (flagged) so the
     * visitor list stays inspectable.
     */
    public function shouldTrack(Request $request): bool
    {
        $user = $request->user();

        return ! ($user !== null && $user->isPlatformAdmin());
    }

    /** @return array<string, string|null> */
    public function utmFrom(Request $request): array
    {
        $utm = [];

        foreach (self::UTM_KEYS as $key) {
            $value = $request->query($key);
            $utm[$key] = is_string($value) && trim($value) !== '' ? Str::limit(trim($value), 120, '') : null;
        }

        return $utm;
    }

    /**
     * Record a visit. Creates the visitor on first sight and updates the last-touch
     * context on every visit.
     */
    public function track(Request $request, string $visitorId, string $path): MarketingVisitor
    {
        $now = Carbon::now();
        $device = DeviceCategory::fromUserAgent($request->userAgent());
        $utm = $this->utmFrom($request);
        $referrer = $request->headers->get('referer');
        $referrer = is_string($referrer) ? Str::limit($referrer, 500, '') : null;
        $country = $this->countryFrom($request);
        $channel = $utm['utm_source'] !== null || $utm['utm_medium'] !== null
            ? MarketingChannel::detect($utm['utm_source'], $utm['utm_medium'], $referrer)
            : MarketingChannel::detect(null, null, $referrer);

        $visitor = MarketingVisitor::query()->firstOrNew(['visitor_id' => $visitorId]);

        if (! $visitor->exists) {
            $visitor->fill([
                'first_seen_at' => $now,
                'first_path' => Str::limit($path, 500, ''),
                'first_referrer' => $referrer,
                'first_source' => $utm['utm_source'],
                'first_medium' => $utm['utm_medium'],
                'first_campaign' => $utm['utm_campaign'],
                'first_term' => $utm['utm_term'],
                'first_content' => $utm['utm_content'],
                'pageview_count' => 0,
            ]);
        }

        // The acquisition channel is fixed by the first campaign that brought the
        // visitor in, so a later direct visit does not rewrite where they came from.
        $effectiveChannel = $visitor->first_source !== null && $visitor->channel !== null
            ? $visitor->channel
            : $channel;

        // A later visit without UTMs must not erase the context a campaign gave us.
        $visitor->fill(array_filter([
            'last_seen_at' => $now,
            'last_path' => Str::limit($path, 500, ''),
            'last_referrer' => $referrer,
            'last_source' => $utm['utm_source'],
            'last_medium' => $utm['utm_medium'],
            'last_campaign' => $utm['utm_campaign'],
            'last_term' => $utm['utm_term'],
            'last_content' => $utm['utm_content'],
            'channel' => $effectiveChannel->value,
            'device' => $device->value,
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            'country' => $country,
            'ip_hash' => IpHasher::fromRequest($request),
            'is_bot' => $device === DeviceCategory::Bot,
        ], fn ($value) => $value !== null));

        $visitor->pageview_count = ($visitor->pageview_count ?? 0) + 1;
        $visitor->save();

        return $visitor;
    }

    /**
     * Country resolution uses only the trusted proxy header set that the pricing
     * region middleware already trusts. No third-party IP lookup is performed here.
     */
    protected function countryFrom(Request $request): ?string
    {
        if (! config('platform.pricing.trust_country_header', true)) {
            return null;
        }

        foreach ((array) config('platform.pricing.country_headers', []) as $header) {
            $value = $request->headers->get($header);

            if (is_string($value) && preg_match('/^[A-Za-z]{2}$/', $value) === 1) {
                return strtoupper($value);
            }
        }

        return null;
    }
}
