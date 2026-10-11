<?php

namespace App\Domain\Subscriptions\Enums;

enum InvoiceStatus: string
{
    case Draft = 'draft';
    case Issued = 'issued';
    case Open = 'open';
    case PartiallyPaid = 'partially_paid';
    case Paid = 'paid';
    case Overdue = 'overdue';
    case Void = 'void';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Issued => 'Issued',
            self::Open => 'Open',
            self::PartiallyPaid => 'Partially paid',
            self::Paid => 'Paid',
            self::Overdue => 'Overdue',
            self::Void => 'Void',
            self::Refunded => 'Refunded',
        };
    }

    public function isSettled(): bool
    {
        return in_array($this, [self::Paid, self::Refunded], true);
    }

    public function isOutstanding(): bool
    {
        return in_array($this, [self::Issued, self::Open, self::PartiallyPaid, self::Overdue], true);
    }

    /** @return list<string> */
    public static function outstandingValues(): array
    {
        return array_map(
            fn (self $s) => $s->value,
            array_filter(self::cases(), fn (self $s) => $s->isOutstanding()),
        );
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
