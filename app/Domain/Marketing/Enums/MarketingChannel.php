<?php

namespace App\Domain\Marketing\Enums;

/**
 * Where a visitor, lead or campaign came from. See docs/marketing/METRICS.md.
 */
enum MarketingChannel: string
{
    case MetaAds = 'meta_ads';
    case GoogleAds = 'google_ads';
    case Organic = 'organic';
    case Email = 'email';
    case Social = 'social';
    case Referral = 'referral';
    case Affiliate = 'affiliate';
    case Direct = 'direct';
    case Content = 'content';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::MetaAds => 'Meta Ads',
            self::GoogleAds => 'Google Ads',
            self::Organic => 'Organic Search',
            self::Email => 'Email Marketing',
            self::Social => 'Social Media',
            self::Referral => 'Referral',
            self::Affiliate => 'Affiliate',
            self::Direct => 'Direct Traffic',
            self::Content => 'Content Marketing',
            self::Other => 'Other Sources',
        };
    }

    /** Paid channels draw from an advertising budget. */
    public function isPaid(): bool
    {
        return in_array($this, [self::MetaAds, self::GoogleAds], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /**
     * Resolve a channel from a source/medium pair and a referrer.
     *
     * Heuristic by design: a search visit with a stripped referrer is recorded as
     * direct. See docs/marketing/METRICS.md §6.6.
     */
    public static function detect(?string $source, ?string $medium, ?string $referrer): self
    {
        $source = strtolower(trim((string) $source));
        $medium = strtolower(trim((string) $medium));
        $referrer = strtolower((string) $referrer);

        if ($source !== '') {
            if (str_contains($source, 'facebook') || str_contains($source, 'instagram') || str_contains($source, 'meta')) {
                return $medium === 'cpc' || $medium === 'paid' ? self::MetaAds : self::Social;
            }

            if (str_contains($source, 'google') && in_array($medium, ['cpc', 'paid', 'ppc', 'display'], true)) {
                return self::GoogleAds;
            }

            if (in_array($medium, ['email', 'newsletter'], true) || str_contains($source, 'mail')) {
                return self::Email;
            }

            if (in_array($medium, ['referral', 'affiliate'], true)) {
                return $medium === 'affiliate' ? self::Affiliate : self::Referral;
            }

            if (in_array($medium, ['social', 'social-media'], true)) {
                return self::Social;
            }

            if (in_array($medium, ['organic', 'search'], true) || str_contains($source, 'google')) {
                return self::Organic;
            }

            if ($medium === 'cpc' || $medium === 'paid') {
                return self::Other;
            }
        }

        if ($referrer === '') {
            return self::Direct;
        }

        foreach (['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia'] as $engine) {
            if (str_contains($referrer, $engine)) {
                return self::Organic;
            }
        }

        foreach (['facebook', 'instagram', 'twitter', 'x.com', 'linkedin', 'tiktok', 'youtube', 'reddit'] as $network) {
            if (str_contains($referrer, $network)) {
                return self::Social;
            }
        }

        return self::Referral;
    }
}
