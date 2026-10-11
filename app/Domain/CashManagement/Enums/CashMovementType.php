<?php

namespace App\Domain\CashManagement\Enums;

enum CashMovementType: string
{
    case Opening = 'opening';
    case Sale = 'sale';
    case Refund = 'refund';
    case CashIn = 'cash_in';
    case CashOut = 'cash_out';
    case Closing = 'closing';

    public function label(): string
    {
        return match ($this) {
            self::Opening => 'Opening float',
            self::Sale => 'Cash sale',
            self::Refund => 'Cash refund',
            self::CashIn => 'Cash in',
            self::CashOut => 'Cash out',
            self::Closing => 'Closing count',
        };
    }
}
