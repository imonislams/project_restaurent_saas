<?php

namespace App\Domain\Kitchen\Enums;

enum KitchenTicketStatus: string
{
    case New = 'new';
    case Accepted = 'accepted';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case HandedOver = 'handed_over';
    case Served = 'served';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::New => 'New',
            self::Accepted => 'Accepted',
            self::Preparing => 'Preparing',
            self::Ready => 'Ready',
            self::HandedOver => 'Handed over',
            self::Served => 'Served',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * Allowed forward moves, plus the one-step corrections the KDS board offers
     * (bump back to the previous kitchen column). Anything else is rejected so
     * status can never jump to Served/Cancelled from an early state.
     *
     * @return list<self>
     */
    public function allowedNext(): array
    {
        return match ($this) {
            self::New => [self::Accepted, self::Preparing, self::Cancelled],
            self::Accepted => [self::Preparing, self::New, self::Cancelled],
            self::Preparing => [self::Ready, self::New, self::Cancelled],
            self::Ready => [self::HandedOver, self::Served, self::Preparing, self::Cancelled],
            self::HandedOver => [self::Served, self::Ready],
            self::Served, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedNext(), true);
    }

    public function isTerminal(): bool
    {
        return $this === self::Served || $this === self::Cancelled;
    }

    public function isOpen(): bool
    {
        return ! $this->isTerminal();
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
