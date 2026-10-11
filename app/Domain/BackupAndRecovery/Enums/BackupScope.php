<?php

namespace App\Domain\BackupAndRecovery\Enums;

enum BackupScope: string
{
    case Platform = 'platform';
    case Tenant = 'tenant';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
