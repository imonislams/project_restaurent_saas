<?php

namespace App\Domain\Orders\Enums;

enum OrderStatus: string
{
    case Draft = 'draft';
    case Held = 'held';
    case Completed = 'completed';
    case Voided = 'voided';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Held => 'Held',
            self::Completed => 'Completed',
            self::Voided => 'Voided',
        };
    }

    public function isFinal(): bool
    {
        return $this === self::Completed || $this === self::Voided;
    }
}
