<?php

namespace App\Domain\Menu\Enums;

enum ModifierSelectionType: string
{
    case Single = 'single';
    case Multiple = 'multiple';

    public function label(): string
    {
        return match ($this) {
            self::Single => 'Single choice',
            self::Multiple => 'Multiple choice',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
