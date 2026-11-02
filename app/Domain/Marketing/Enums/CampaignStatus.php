<?php

namespace App\Domain\Marketing\Enums;

enum CampaignStatus: string
{
    case Draft = 'draft';
    case Scheduled = 'scheduled';
    case Active = 'active';
    case Paused = 'paused';
    case Completed = 'completed';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Scheduled => 'Scheduled',
            self::Active => 'Active',
            self::Paused => 'Paused',
            self::Completed => 'Completed',
            self::Archived => 'Archived',
        };
    }

    /** A campaign in this state is collecting traffic and results. */
    public function isLive(): bool
    {
        return in_array($this, [self::Active, self::Paused], true);
    }

    public function isEditable(): bool
    {
        return in_array($this, [self::Draft, self::Scheduled, self::Active, self::Paused], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
