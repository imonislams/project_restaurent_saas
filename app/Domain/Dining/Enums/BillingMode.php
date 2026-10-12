<?php

namespace App\Domain\Dining\Enums;

enum BillingMode: string
{
    case Consolidated = 'consolidated';
    case Individual = 'individual';

    public function label(): string
    {
        return match ($this) {
            self::Consolidated => 'Consolidated table bill',
            self::Individual => 'Individual order billing',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
