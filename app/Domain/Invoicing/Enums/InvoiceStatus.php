<?php

namespace App\Domain\Invoicing\Enums;

enum InvoiceStatus: string
{
    case Draft = 'draft';
    case Open = 'open';
    case PartiallyPaid = 'partially_paid';
    case Paid = 'paid';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Open => 'Open',
            self::PartiallyPaid => 'Partially paid',
            self::Paid => 'Paid',
            self::Void => 'Void',
        };
    }

    /** A finalized invoice must never be silently modified. */
    public function isFinalized(): bool
    {
        return $this === self::Paid || $this === self::Void;
    }

    /** Whether further orders may be added to this invoice. */
    public function isEditable(): bool
    {
        return ! $this->isFinalized();
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
