<?php

namespace App\Domain\Onboarding\Enums;

enum OnboardingStep: string
{
    case Profile = 'profile';
    case Company = 'company';
    case Branch = 'branch';
    case Hours = 'hours';
    case Tax = 'tax';
    case Receipt = 'receipt';
    case Payments = 'payments';
    case Menu = 'menu';
    case Team = 'team';
    case Review = 'review';

    public function label(): string
    {
        return match ($this) {
            self::Profile => 'Your profile',
            self::Company => 'Company & region',
            self::Branch => 'First branch',
            self::Hours => 'Operating hours',
            self::Tax => 'Tax preferences',
            self::Receipt => 'Receipt setup',
            self::Payments => 'Payment methods',
            self::Menu => 'First menu items',
            self::Team => 'Invite your team',
            self::Review => 'Review & activate',
        };
    }

    public function isRequired(): bool
    {
        return in_array($this, [self::Profile, self::Company, self::Branch], true);
    }

    public function isOptional(): bool
    {
        return ! $this->isRequired() && $this !== self::Review;
    }

    public function description(): string
    {
        return match ($this) {
            self::Profile => 'Confirm your name and contact details as the account owner.',
            self::Company => 'Business name, contact details and regional defaults.',
            self::Branch => 'Create the first location customers will be served from.',
            self::Hours => 'When the branch opens and closes each day.',
            self::Tax => 'Tax name, rate and whether prices include tax.',
            self::Receipt => 'Header, footer and what appears on printed receipts.',
            self::Payments => 'Decide how you take payment — cash, card or an online gateway.',
            self::Menu => 'Add your first category and product so you can ring up a sale.',
            self::Team => 'Invite a manager or cashier to help run the restaurant.',
            self::Review => 'Confirm your setup and finish onboarding.',
        };
    }

    /** @return list<self> */
    public static function ordered(): array
    {
        return self::cases();
    }

    public function next(): ?self
    {
        $steps = self::ordered();
        $index = array_search($this, $steps, true);

        return $index === false ? null : ($steps[$index + 1] ?? null);
    }

    public function previous(): ?self
    {
        $steps = self::ordered();
        $index = array_search($this, $steps, true);

        return $index === false || $index === 0 ? null : $steps[$index - 1];
    }
}
