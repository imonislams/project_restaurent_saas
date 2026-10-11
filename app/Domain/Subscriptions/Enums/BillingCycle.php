<?php

namespace App\Domain\Subscriptions\Enums;

use App\Domain\Subscriptions\Models\Plan;

enum BillingCycle: string
{
    case Monthly = 'monthly';
    case Yearly = 'yearly';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    public function months(): int
    {
        return $this === self::Yearly ? 12 : 1;
    }

    public function priceFor(Plan $plan): float
    {
        return (float) ($this === self::Yearly ? $plan->price_yearly : $plan->price_monthly);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
