<?php

namespace App\Domain\Marketing\Enums;

enum LeadStatus: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case Qualified = 'qualified';
    case DemoScheduled = 'demo_scheduled';
    case DemoCompleted = 'demo_completed';
    case TrialStarted = 'trial_started';
    case ProposalSent = 'proposal_sent';
    case Converted = 'converted';
    case Lost = 'lost';

    public function label(): string
    {
        return match ($this) {
            self::New => 'New',
            self::Contacted => 'Contacted',
            self::Qualified => 'Qualified',
            self::DemoScheduled => 'Demo scheduled',
            self::DemoCompleted => 'Demo completed',
            self::TrialStarted => 'Trial started',
            self::ProposalSent => 'Proposal sent',
            self::Converted => 'Converted',
            self::Lost => 'Lost',
        };
    }

    public function isOpen(): bool
    {
        return ! in_array($this, [self::Converted, self::Lost], true);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [self::Converted, self::Lost], true);
    }

    /** Pipeline order, used by the Kanban and the stage funnel. */
    public static function pipeline(): array
    {
        return [
            self::New,
            self::Contacted,
            self::Qualified,
            self::DemoScheduled,
            self::DemoCompleted,
            self::TrialStarted,
            self::ProposalSent,
            self::Converted,
            self::Lost,
        ];
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
