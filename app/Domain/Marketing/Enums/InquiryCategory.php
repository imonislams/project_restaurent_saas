<?php

namespace App\Domain\Marketing\Enums;

enum InquiryCategory: string
{
    case Sales = 'sales';
    case Migration = 'migration';
    case CustomHardware = 'custom_hardware';
    case Partnership = 'partnership';

    public function label(): string
    {
        return match ($this) {
            self::Sales => 'Sales & pricing',
            self::Migration => 'Menu & data migration',
            self::CustomHardware => 'Custom hardware',
            self::Partnership => 'Partner & reseller',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** @return list<array{value: string, label: string}> */
    public static function options(): array
    {
        return array_map(
            fn (self $case) => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
