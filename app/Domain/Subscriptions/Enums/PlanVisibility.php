<?php

namespace App\Domain\Subscriptions\Enums;

enum PlanVisibility: string
{
    case Public = 'public';
    case Hidden = 'hidden';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
