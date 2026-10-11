<?php

namespace App\Domain\Inventory\Enums;

enum TransferStatus: string
{
    case Draft = 'draft';
    case Approved = 'approved';
    case Dispatched = 'dispatched';
    case Received = 'received';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Approved => 'Approved',
            self::Dispatched => 'Dispatched',
            self::Received => 'Received',
            self::Cancelled => 'Cancelled',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
