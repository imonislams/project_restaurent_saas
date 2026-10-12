<?php

namespace App\Domain\Orders\Enums;

/**
 * Staff confirmation state for QR-originated orders. POS orders are always
 * `auto_accepted`; QR orders may require explicit staff acceptance.
 */
enum AcceptanceStatus: string
{
    case AutoAccepted = 'auto_accepted';
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::AutoAccepted => 'Auto accepted',
            self::Pending => 'Awaiting confirmation',
            self::Accepted => 'Accepted',
            self::Rejected => 'Rejected',
        };
    }

    /** Whether the order may proceed to the kitchen. */
    public function isConfirmed(): bool
    {
        return in_array($this, [self::AutoAccepted, self::Accepted], true);
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
