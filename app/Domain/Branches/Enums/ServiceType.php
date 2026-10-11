<?php

namespace App\Domain\Branches\Enums;

enum ServiceType: string
{
    case DineIn = 'dine_in';
    case Takeaway = 'takeaway';
    case Delivery = 'delivery';
    case Counter = 'counter';

    public function label(): string
    {
        return match ($this) {
            self::DineIn => 'Dine-in',
            self::Takeaway => 'Takeaway',
            self::Delivery => 'Delivery',
            self::Counter => 'Counter service',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
