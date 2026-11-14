<?php

namespace App\Domain\Marketing\Enums;

enum LeadSource: string
{
    case ContactForm = 'contact_form';
    case DemoForm = 'demo_form';
    case Registration = 'registration';
    case LandingPage = 'landing_page';
    case Newsletter = 'newsletter';
    case Import = 'import';
    case Manual = 'manual';
    case Referral = 'referral';

    public function label(): string
    {
        return match ($this) {
            self::ContactForm => 'Contact form',
            self::DemoForm => 'Demo request',
            self::Registration => 'Registration',
            self::LandingPage => 'Landing page',
            self::Newsletter => 'Newsletter',
            self::Import => 'Imported',
            self::Manual => 'Added manually',
            self::Referral => 'Referral',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
