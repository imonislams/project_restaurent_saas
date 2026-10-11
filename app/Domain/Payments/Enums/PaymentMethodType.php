<?php

namespace App\Domain\Payments\Enums;

enum PaymentMethodType: string
{
    case Cash = 'cash';
    case Card = 'card';
    case Mobile = 'mobile';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash',
            self::Card => 'Card',
            self::Mobile => 'Mobile financial service',
            self::Other => 'Other',
        };
    }

    public function isCash(): bool
    {
        return $this === self::Cash;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
