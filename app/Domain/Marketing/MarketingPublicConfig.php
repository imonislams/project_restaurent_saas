<?php

namespace App\Domain\Marketing;

use App\Domain\Marketing\Enums\EventName;
use App\Domain\PlatformSettings\PlatformSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * The marketing values the browser needs: which tags to load, what consent state the
 * visitor is in, and where to send events.
 *
 * Only public identifiers are returned — a Meta pixel id, a GTM container id, a GA4
 * measurement id. No secret ever appears here, and a provider that is not both
 * switched on and verified contributes nothing, so a half-configured integration
 * never renders a tag.
 *
 * Fail-safe by design: a problem here must never break a page render, but it is
 * logged rather than swallowed.
 */
class MarketingPublicConfig
{
    public const DEFAULT_TEXT_EN = 'We use cookies to understand how the site is used and to measure which of our campaigns brought you here. Essential cookies keep you signed in and remember your preferences. You can choose what to allow, and change your mind at any time.';

    public const DEFAULT_TEXT_BN = 'সাইটটি কীভাবে ব্যবহার করা হচ্ছে এবং কোন প্রচারণা আপনাকে এখানে এনেছে তা বোঝার জন্য আমরা কুকিজ ব্যবহার করি। অপরিহার্য কুকিজ আপনার লগইন ও পছন্দগুলো মনে রাখে। কোনটি অনুমোদন করবেন তা আপনি বেছে নিতে পারেন এবং যেকোনো সময় পরিবর্তন করতে পারেন।';

    public function __construct(
        protected MarketingIntegrationService $integrations,
        protected ConsentService $consent,
        protected VisitorTracker $tracker,
        protected PlatformSettings $settings,
    ) {}

    /** @return array<string, mixed> */
    public function forRequest(Request $request): array
    {
        try {
            $visitorId = $this->tracker->visitorId($request);
            $locale = app()->getLocale();

            return [
                'tracking' => $this->integrations->clientConfig(),
                'consent' => [
                    'enabled' => $this->consent->enabled(),
                    'version' => $this->consent->version(),
                    'block_before_consent' => $this->consent->blocksBeforeConsent(),
                    'defaults' => $this->consent->defaults(),
                    'granted' => $this->consent->current($visitorId, $request->user()),
                    'recorded' => $this->consent->hasRecord($visitorId, $request->user()),
                    'text' => $this->text($locale),
                ],
                'enabled_events' => $this->enabledEvents(),
                'collect_url' => '/marketing/events',
                'consent_url' => '/marketing/consent',
                'visitor_cookie' => VisitorTracker::COOKIE,
            ];
        } catch (\Throwable $e) {
            Log::warning('Marketing browser configuration could not be built.', ['error' => $e->getMessage()]);

            return $this->empty();
        }
    }

    /**
     * A neutral configuration, used when the marketing tables are unavailable. It
     * loads no tags and prompts for nothing — the safe direction to fail.
     *
     * @return array<string, mixed>
     */
    public function empty(): array
    {
        return [
            'tracking' => ['meta_pixel' => null, 'ga4' => null, 'gtm' => null, 'google_ads' => null],
            'consent' => [
                'enabled' => false,
                'version' => '1',
                'block_before_consent' => true,
                'defaults' => ['essential' => true, 'analytics' => false, 'advertising' => false],
                'granted' => ['essential' => true, 'analytics' => false, 'advertising' => false],
                'recorded' => true,
                'text' => self::DEFAULT_TEXT_EN,
            ],
            'enabled_events' => [],
            'collect_url' => '/marketing/events',
            'consent_url' => '/marketing/consent',
            'visitor_cookie' => VisitorTracker::COOKIE,
        ];
    }

    protected function text(string $locale): string
    {
        $key = $locale === 'bn' ? 'consent.banner_text_bn' : 'consent.banner_text_en';
        $fallback = $locale === 'bn' ? self::DEFAULT_TEXT_BN : self::DEFAULT_TEXT_EN;

        $configured = trim((string) ($this->settings->get($key) ?? ''));

        return $configured !== '' ? $configured : $fallback;
    }

    /** @return list<string> */
    protected function enabledEvents(): array
    {
        $configured = $this->settings->get('marketing.enabled_events');

        if (is_array($configured) && $configured !== []) {
            return array_values(array_map('strval', $configured));
        }

        return EventName::values();
    }
}
