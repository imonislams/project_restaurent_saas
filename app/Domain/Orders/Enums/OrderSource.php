<?php

namespace App\Domain\Orders\Enums;

enum OrderSource: string
{
    case Pos = 'pos';
    case Qr = 'qr';
    case Kiosk = 'kiosk';

    public function label(): string
    {
        return match ($this) {
            self::Pos => 'POS',
            self::Qr => 'QR Dining',
            self::Kiosk => 'Kiosk',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
