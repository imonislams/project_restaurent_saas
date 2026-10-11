<?php

namespace App\Domain\Inventory\Enums;

enum StockMovementReason: string
{
    case Opening = 'opening';
    case Purchase = 'purchase';
    case Sale = 'sale';
    case Adjustment = 'adjustment';
    case Waste = 'waste';
    case TransferIn = 'transfer_in';
    case TransferOut = 'transfer_out';
    case Return = 'return';

    public function label(): string
    {
        return match ($this) {
            self::Opening => 'Opening stock',
            self::Purchase => 'Purchase receipt',
            self::Sale => 'Sale',
            self::Adjustment => 'Manual adjustment',
            self::Waste => 'Waste',
            self::TransferIn => 'Transfer in',
            self::TransferOut => 'Transfer out',
            self::Return => 'Return',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
