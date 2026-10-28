<?php

namespace App\Domain\Demo;

use Carbon\Carbon;
use DateTimeInterface;

/**
 * Runs a callback with the application clock set to a past moment.
 *
 * Every domain service stamps its own timestamps (`placed_at`, `paid_at`,
 * `cash_movements.created_at`, ticket stages, audit rows, …), so advancing the
 * clock is what turns a burst of inserts into 21 days of coherent history —
 * no post-hoc timestamp rewriting.
 *
 * The clock is restored in a `finally`, including when the callback throws: a
 * back-dated clock must never survive into the response, because the session
 * store stamps `last_activity` from the same clock.
 */
class DemoClock
{
    public static function at(DateTimeInterface|string $moment, callable $callback): mixed
    {
        $previous = Carbon::hasTestNow() ? Carbon::getTestNow() : null;

        Carbon::setTestNow($moment);

        try {
            return $callback();
        } finally {
            Carbon::setTestNow($previous);
        }
    }
}
