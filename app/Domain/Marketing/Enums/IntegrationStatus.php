<?php

namespace App\Domain\Marketing\Enums;

/**
 * Integration status vocabulary.
 *
 * `connected` is earned by a successful test or sync — it is never set because a
 * credential field was filled in. `configured` means the keys exist but nothing has
 * been proven yet.
 */
enum IntegrationStatus: string
{
    case NotConfigured = 'not_configured';
    case Disabled = 'disabled';
    case Configured = 'configured';
    case Connected = 'connected';
    case Error = 'error';

    public function label(): string
    {
        return match ($this) {
            self::NotConfigured => 'Not configured',
            self::Disabled => 'Disabled',
            self::Configured => 'Configured, not verified',
            self::Connected => 'Connected',
            self::Error => 'Error',
        };
    }

    /** Whether the integration may be used for dispatch or sync. */
    public function isOperational(): bool
    {
        return $this === self::Connected;
    }

    public function tone(): string
    {
        return match ($this) {
            self::Connected => 'success',
            self::Configured => 'warning',
            self::Error => 'danger',
            self::NotConfigured => 'neutral',
            self::Disabled => 'neutral',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
