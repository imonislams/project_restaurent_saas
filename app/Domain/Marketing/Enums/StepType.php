<?php

namespace App\Domain\Marketing\Enums;

enum StepType: string
{
    case Email = 'email';
    case Wait = 'wait';
    case Condition = 'condition';
    case Action = 'action';

    public function label(): string
    {
        return match ($this) {
            self::Email => 'Send email',
            self::Wait => 'Wait',
            self::Condition => 'Condition',
            self::Action => 'Action',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
