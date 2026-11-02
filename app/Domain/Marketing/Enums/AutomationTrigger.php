<?php

namespace App\Domain\Marketing\Enums;

enum AutomationTrigger: string
{
    case LeadCreated = 'lead_created';
    case DemoRequested = 'demo_requested';
    case RegistrationIncomplete = 'registration_incomplete';
    case TenantCreated = 'tenant_created';
    case TrialStarted = 'trial_started';
    case TrialEnding = 'trial_ending';
    case InvoiceUnpaid = 'invoice_unpaid';
    case PeriodEnding = 'period_ending';
    case PaymentFailed = 'payment_failed';
    case SubscriptionCancelled = 'subscription_cancelled';
    case InactiveTenant = 'inactive_tenant';
    case UsageThreshold = 'usage_threshold';

    public function label(): string
    {
        return match ($this) {
            self::LeadCreated => 'Lead created',
            self::DemoRequested => 'Demo requested',
            self::RegistrationIncomplete => 'Registration started, not completed',
            self::TenantCreated => 'Restaurant registered',
            self::TrialStarted => 'Trial started',
            self::TrialEnding => 'Trial ending',
            self::InvoiceUnpaid => 'Invoice unpaid',
            self::PeriodEnding => 'Billing period ending',
            self::PaymentFailed => 'Payment failed',
            self::SubscriptionCancelled => 'Subscription cancelled',
            self::InactiveTenant => 'Restaurant inactive',
            self::UsageThreshold => 'Usage near plan limit',
        };
    }

    /** The enrolled subject type, used by marketing_automation_enrollments. */
    public function subjectType(): string
    {
        return match ($this) {
            self::LeadCreated, self::DemoRequested, self::RegistrationIncomplete => 'marketing_lead',
            default => 'tenant',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
