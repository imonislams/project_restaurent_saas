<?php

namespace App\Domain\Waste\Enums;

enum WasteReason: string
{
    case Expiry = 'expiry';
    case PreparationError = 'preparation_error';
    case Damage = 'damage';
    case Spoilage = 'spoilage';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Expiry => 'Expiry',
            self::PreparationError => 'Preparation error',
            self::Damage => 'Damage',
            self::Spoilage => 'Spoilage',
            self::Other => 'Other',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
