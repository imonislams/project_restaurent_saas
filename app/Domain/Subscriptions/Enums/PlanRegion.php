<?php

namespace App\Domain\Subscriptions\Enums;

/**
 * The audience a plan is priced for. `Global` plans are shown to every region;
 * `Bangladesh` / `International` plans are shown only to that region.
 */
enum PlanRegion: string
{
    case International = 'international';
    case Bangladesh = 'bd';
    case Global = 'global';

    public function label(): string
    {
        return match ($this) {
            self::International => 'International',
            self::Bangladesh => 'Bangladesh',
            self::Global => 'Global (all regions)',
        };
    }

    /** Regions recognised for detection / overrides. */
    public static function selectable(): array
    {
        return [self::Bangladesh->value, self::International->value];
    }

    /**
     * Regions a plan can be created for. Two options, each with its own price.
     *
     * @return list<string>
     */
    public static function adminSelectable(): array
    {
        return [self::Bangladesh->value, self::International->value];
    }

    /**
     * The regions whose plans are visible to a visitor in the given region.
     *
     * @return list<string>
     */
    public static function visibleTo(string $region): array
    {
        return array_values(array_unique([$region, self::Global->value]));
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
