<?php

namespace App\Domain\Subscriptions\Enums;

enum InvoiceStatus: string
{
    case Open = 'open';
    case Paid = 'paid';
    case Void = 'void';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
