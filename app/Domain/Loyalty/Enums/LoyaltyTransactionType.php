<?php

namespace App\Domain\Loyalty\Enums;

enum LoyaltyTransactionType: string
{
    case Earn = 'earn';
    case Redeem = 'redeem';
    case Adjust = 'adjust';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
