<?php

namespace App\Domain\Realtime;

/**
 * Sends real-time events on behalf of the business flows.
 *
 * Two gates, both important: nothing is sent while the driver is off or the
 * stream is silenced, and a websocket failure is reported — never thrown — so a
 * broken socket can never break a sale or a kitchen update.
 */
class RealtimeBroadcaster
{
    public function __construct(protected RealtimeManager $realtime) {}

    public function send(object $event, string $stream = 'staff'): void
    {
        if (! $this->realtime->enabled() || ! $this->realtime->streamEnabled($stream)) {
            return;
        }

        try {
            broadcast($event);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
