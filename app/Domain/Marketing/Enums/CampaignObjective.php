<?php

namespace App\Domain\Marketing\Enums;

enum CampaignObjective: string
{
    case Awareness = 'awareness';
    case Leads = 'leads';
    case Trials = 'trials';
    case Conversions = 'conversions';
    case Retention = 'retention';

    public function label(): string
    {
        return match ($this) {
            self::Awareness => 'Brand awareness',
            self::Leads => 'Lead generation',
            self::Trials => 'Trial signups',
            self::Conversions => 'Paid conversions',
            self::Retention => 'Retention',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
