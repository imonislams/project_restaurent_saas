<?php

namespace App\Domain\Subscriptions\Enums;

/**
 * The modules a plan can entitle. Keys match the tenant feature keys resolved
 * in HandleInertiaRequests, so this is the single source for plan feature
 * options and their labels.
 */
enum PlanFeature: string
{
    case Pos = 'pos';
    case Kitchen = 'kitchen';
    case Tables = 'tables';
    case Menu = 'menu';
    case Inventory = 'inventory';
    case Purchasing = 'purchasing';
    case Waste = 'waste';
    case Transfers = 'transfers';
    case Accounts = 'accounts';
    case Reports = 'reports';

    public function label(): string
    {
        return match ($this) {
            self::Pos => 'POS Terminal',
            self::Kitchen => 'Kitchen Display',
            self::Tables => 'Tables & Floor',
            self::Menu => 'Menu & Products',
            self::Inventory => 'Inventory',
            self::Purchasing => 'Purchasing',
            self::Waste => 'Waste & Loss',
            self::Transfers => 'Stock Transfers',
            self::Accounts => 'Accounts',
            self::Reports => 'Reports',
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
        return array_map(fn (self $case) => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
