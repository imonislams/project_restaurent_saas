<?php

namespace App\Domain\Orders\Enums;

enum OrderType: string
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
            self::Counter => 'Counter',
        };
    }

    /** Price column used for this order type. */
    public function priceColumn(): string
    {
        return match ($this) {
            self::DineIn => 'price_dine_in',
            self::Takeaway => 'price_takeaway',
            self::Delivery => 'price_delivery',
            self::Counter => 'price_dine_in',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
