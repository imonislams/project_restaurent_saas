<?php

namespace App\Domain\Marketing\Enums;

enum DeviceCategory: string
{
    case Desktop = 'desktop';
    case Mobile = 'mobile';
    case Tablet = 'tablet';
    case Bot = 'bot';

    public function label(): string
    {
        return match ($this) {
            self::Desktop => 'Desktop',
            self::Mobile => 'Mobile',
            self::Tablet => 'Tablet',
            self::Bot => 'Bot',
        };
    }

    /**
     * Heuristic classification from a user agent string. Deliberately simple and
     * documented as heuristic — sophisticated bots will still pass through, which
     * is why the visitor list is inspectable. See docs/marketing/METRICS.md §6.10.
     */
    public static function fromUserAgent(?string $userAgent): self
    {
        $agent = strtolower(trim((string) $userAgent));

        if ($agent === '') {
            return self::Desktop;
        }

        foreach ([
            'bot', 'crawl', 'spider', 'slurp', 'bingpreview', 'curl/', 'wget/',
            'headlesschrome', 'python-requests', 'facebookexternalhit', 'monitoring',
            'uptime', 'pingdom', 'lighthouse',
        ] as $needle) {
            if (str_contains($agent, $needle)) {
                return self::Bot;
            }
        }

        if (str_contains($agent, 'ipad') || str_contains($agent, 'tablet') || str_contains($agent, 'kindle')) {
            return self::Tablet;
        }

        foreach (['mobile', 'iphone', 'ipod', 'android', 'windows phone', 'blackberry'] as $needle) {
            if (str_contains($agent, $needle)) {
                return self::Mobile;
            }
        }

        return self::Desktop;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
