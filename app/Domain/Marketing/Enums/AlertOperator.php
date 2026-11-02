<?php

namespace App\Domain\Marketing\Enums;

enum AlertOperator: string
{
    case GreaterThan = 'gt';
    case GreaterThanOrEqual = 'gte';
    case LessThan = 'lt';
    case LessThanOrEqual = 'lte';
    case Equal = 'eq';

    public function label(): string
    {
        return match ($this) {
            self::GreaterThan => 'is greater than',
            self::GreaterThanOrEqual => 'is at least',
            self::LessThan => 'is less than',
            self::LessThanOrEqual => 'is at most',
            self::Equal => 'is equal to',
        };
    }

    public function evaluate(float $value, float $threshold): bool
    {
        return match ($this) {
            self::GreaterThan => $value > $threshold,
            self::GreaterThanOrEqual => $value >= $threshold,
            self::LessThan => $value < $threshold,
            self::LessThanOrEqual => $value <= $threshold,
            self::Equal => abs($value - $threshold) < 0.0001,
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
