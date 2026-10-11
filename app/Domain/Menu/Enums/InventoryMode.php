<?php

namespace App\Domain\Menu\Enums;

enum InventoryMode: string
{
    case None = 'none';
    case Product = 'product';
    case Recipe = 'recipe';

    public function label(): string
    {
        return match ($this) {
            self::None => 'Not tracked',
            self::Product => 'Track this product\'s own stock',
            self::Recipe => 'Deduct ingredients via recipe',
        };
    }

    public function tracksStock(): bool
    {
        return $this !== self::None;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
