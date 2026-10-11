<?php

namespace App\Domain\Accounting\Enums;

enum AccountType: string
{
    case Cash = 'cash';
    case Bank = 'bank';
    case Mobile = 'mobile';
    case Gateway = 'gateway';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash register',
            self::Bank => 'Bank account',
            self::Mobile => 'Mobile financial service',
            self::Gateway => 'Payment gateway clearing',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
