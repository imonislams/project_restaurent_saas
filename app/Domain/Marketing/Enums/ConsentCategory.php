<?php

namespace App\Domain\Marketing\Enums;

/**
 * Consent categories. Reused as the event category taxonomy so a single
 * vocabulary decides both what is stored and what may be dispatched.
 */
enum ConsentCategory: string
{
    case Essential = 'essential';
    case Analytics = 'analytics';
    case Advertising = 'advertising';

    public function label(): string
    {
        return match ($this) {
            self::Essential => 'Essential',
            self::Analytics => 'Analytics',
            self::Advertising => 'Advertising',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Essential => 'Keeps you signed in and remembers your preferences. Always on.',
            self::Analytics => 'Helps us understand how the site is used so we can improve it.',
            self::Advertising => 'Lets us measure which campaigns brought you here.',
        };
    }

    /** Essential is always granted; the others must be opted into. */
    public function requiresConsent(): bool
    {
        return $this !== self::Essential;
    }

    /** @return array<string, bool> */
    public static function defaults(): array
    {
        return [
            self::Essential->value => true,
            self::Analytics->value => false,
            self::Advertising->value => false,
        ];
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** @return list<string> */
    public static function grantable(): array
    {
        return array_values(array_filter(
            self::values(),
            fn (string $value) => self::from($value)->requiresConsent(),
        ));
    }
}
