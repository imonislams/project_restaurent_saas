<?php

namespace App\Http\Controllers\QrDining\Concerns;

use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use Illuminate\Http\Request;

/**
 * Resolves the dining session (of any status) from the cookie or header, scoped
 * to the table resolved by the QR token.
 */
trait ResolvesDiningSession
{
    protected function diningSessionFromRequest(Request $request): ?DiningSession
    {
        $table = $request->attributes->get('qr_table');
        $token = $request->cookie('dining_session') ?: $request->header('X-Dining-Token');

        if (! $token) {
            return null;
        }

        $session = DiningSession::query()->where('session_token', $token)->first();

        if ($session && $table && (int) $session->table_id !== (int) $table->getKey()) {
            return null;
        }

        return $session;
    }

    protected function participantForRequest(Request $request, DiningSession $session): ?DiningParticipant
    {
        $token = $request->header('X-Dining-Participant');

        if ($token) {
            $found = $session->participants()->where('participant_token', $token)->first();

            if ($found) {
                return $found;
            }
        }

        return $session->participants()->latest('id')->first();
    }
}
