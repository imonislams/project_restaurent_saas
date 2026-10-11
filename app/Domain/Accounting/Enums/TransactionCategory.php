<?php

namespace App\Domain\Accounting\Enums;

enum TransactionCategory: string
{
    case Opening = 'opening';
    case Expense = 'expense';
    case Transfer = 'transfer';
    case Adjustment = 'adjustment';
    case Sale = 'sale';
    case Refund = 'refund';
    case SupplierPayment = 'supplier_payment';

    public function label(): string
    {
        return match ($this) {
            self::Opening => 'Opening balance',
            self::Expense => 'Expense',
            self::Transfer => 'Account transfer',
            self::Adjustment => 'Adjustment',
            self::Sale => 'Sale',
            self::Refund => 'Refund',
            self::SupplierPayment => 'Supplier payment',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
