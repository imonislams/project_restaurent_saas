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
            self::None => 'Don\'t track stock',
            self::Product => 'Count the item itself (e.g. bottled drinks)',
            self::Recipe => 'Use ingredients — build a recipe (e.g. burger)',
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
