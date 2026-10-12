<?php

namespace App\Domain\Dining\Enums;

enum DiningSessionStatus: string
{
    case Open = 'open';
    case BillRequested = 'bill_requested';
    case Settling = 'settling';
    case Closed = 'closed';
    case Expired = 'expired';
    case Abandoned = 'abandoned';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open',
            self::BillRequested => 'Bill requested',
            self::Settling => 'Settling',
            self::Closed => 'Closed',
            self::Expired => 'Expired',
            self::Abandoned => 'Abandoned',
        };
    }

    /** A session that can still accept orders. */
    public function isActive(): bool
    {
        return in_array($this, [self::Open, self::BillRequested, self::Settling], true);
    }

    public function isClosed(): bool
    {
        return in_array($this, [self::Closed, self::Expired, self::Abandoned], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
