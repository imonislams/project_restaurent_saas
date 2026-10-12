<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Enums\BillingMode;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Server-side authorization for what a participant may see or touch within a
 * dining session. Under consolidated billing every participant sees the whole
 * table; under individual billing a participant only sees their own orders.
 */
class DiningAuthorization
{
    public function ordersQuery(DiningSession $session, ?DiningParticipant $participant): HasMany
    {
        $query = $session->orders();

        if ($session->billing_mode === BillingMode::Individual) {
            $query->where('dining_participant_id', $participant?->getKey());
        }

        return $query;
    }

    public function seesWholeTable(DiningSession $session): bool
    {
        return $session->billing_mode === BillingMode::Consolidated;
    }

    public function canSeeParticipant(?DiningParticipant $viewer, DiningParticipant $target): bool
    {
        return $viewer !== null && $viewer->getKey() === $target->getKey();
    }

    /** Private contact details are only ever returned to their owner. */
    public function canSeeContact(?DiningParticipant $viewer, DiningParticipant $target): bool
    {
        return $this->canSeeParticipant($viewer, $target);
    }
}
