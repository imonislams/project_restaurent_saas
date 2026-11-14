<?php

namespace App\Domain\Marketing\Enums;

/**
 * The tracked-event catalog. Each event declares which consent category it belongs
 * to and, where one exists, the equivalent Meta event name.
 */
enum EventName: string
{
    case PageView = 'page_view';
    case ViewContent = 'view_content';
    case Lead = 'lead';
    case Contact = 'contact';
    case DemoRequested = 'demo_requested';
    case RegistrationStarted = 'registration_started';
    case RegistrationCompleted = 'registration_completed';
    case StartTrial = 'start_trial';
    case InitiateCheckout = 'initiate_checkout';
    case AddPaymentInfo = 'add_payment_info';
    case Subscribe = 'subscribe';
    case Purchase = 'purchase';
    case SubscriptionCancelled = 'subscription_cancelled';

    public function label(): string
    {
        return match ($this) {
            self::PageView => 'Page view',
            self::ViewContent => 'Content viewed',
            self::Lead => 'Lead submitted',
            self::Contact => 'Contact submitted',
            self::DemoRequested => 'Demo requested',
            self::RegistrationStarted => 'Registration started',
            self::RegistrationCompleted => 'Restaurant registered',
            self::StartTrial => 'Trial started',
            self::InitiateCheckout => 'Checkout started',
            self::AddPaymentInfo => 'Payment method added',
            self::Subscribe => 'Subscription started',
            self::Purchase => 'Payment completed',
            self::SubscriptionCancelled => 'Subscription cancelled',
        };
    }

    /**
     * The consent category that governs this event.
     *
     * This follows the *collection purpose*, not the Meta mapping: viewing a page is
     * analytics even though Meta calls its equivalent ViewContent. Only genuine
     * conversion signals — a lead, a registration, a trial, a checkout, a payment —
     * are advertising, so a visitor who allows analytics but not advertising still
     * produces a complete funnel for us while nothing is sent to an ad platform.
     */
    public function category(): ConsentCategory
    {
        return match ($this) {
            self::PageView, self::ViewContent, self::RegistrationStarted,
            self::DemoRequested, self::SubscriptionCancelled => ConsentCategory::Analytics,

            default => ConsentCategory::Advertising,
        };
    }

    /**
     * The Meta Conversions API / Pixel event this maps to, or null when Meta has no
     * equivalent. See docs/marketing/PRD.md §6.2.
     */
    public function metaEventName(): ?string
    {
        return match ($this) {
            self::PageView => 'PageView',
            self::ViewContent => 'ViewContent',
            self::Lead, self::DemoRequested => 'Lead',
            self::Contact => 'Contact',
            self::RegistrationCompleted => 'CompleteRegistration',
            self::StartTrial => 'StartTrial',
            self::InitiateCheckout => 'InitiateCheckout',
            self::AddPaymentInfo => 'AddPaymentInfo',
            self::Subscribe => 'Subscribe',
            self::Purchase => 'Purchase',
            self::RegistrationStarted, self::SubscriptionCancelled => null,
        };
    }

    /** Events that carry money and therefore need a value and currency. */
    public function isMonetary(): bool
    {
        return in_array($this, [self::Purchase, self::Subscribe], true);
    }

    /** Events that change the acquisition funnel. */
    public function isConversion(): bool
    {
        return in_array($this, [
            self::Lead, self::Contact, self::DemoRequested,
            self::RegistrationCompleted, self::StartTrial,
            self::InitiateCheckout, self::Subscribe, self::Purchase,
        ], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** @return list<string> */
    public static function metaMapped(): array
    {
        return array_values(array_filter(
            self::values(),
            fn (string $value) => self::from($value)->metaEventName() !== null,
        ));
    }
}
