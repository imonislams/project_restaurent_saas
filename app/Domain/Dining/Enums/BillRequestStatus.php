<?php

namespace App\Domain\Dining\Enums;

enum BillRequestStatus: string
{
    case Pending = 'pending';
    case InProgress = 'in_progress';
    case Settled = 'settled';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::InProgress => 'In progress',
            self::Settled => 'Settled',
            self::Cancelled => 'Cancelled',
        };
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Pending, self::InProgress], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
