<?php

namespace App\Domain\Marketing\Enums;

enum AttributionModel: string
{
    case FirstTouch = 'first_touch';
    case LastTouch = 'last_touch';

    public function label(): string
    {
        return match ($this) {
            self::FirstTouch => 'First touch',
            self::LastTouch => 'Last touch',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::FirstTouch => 'Credits the first recorded touchpoint that brought the visitor in.',
            self::LastTouch => 'Credits the touchpoint recorded immediately before the conversion.',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
