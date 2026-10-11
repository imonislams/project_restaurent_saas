<?php

namespace App\Domain\BackupAndRecovery\Enums;

enum RestoreStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Running = 'running';
    case Completed = 'completed';
    case Failed = 'failed';

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
