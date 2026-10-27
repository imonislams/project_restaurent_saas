<?php

namespace App\Domain\Realtime\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * The diner's tracking page is out of date (an order moved, a payment landed).
 *
 * A public channel keyed by the table's QR token: the token is already the only
 * credential the diner has, and the payload carries nothing but the reason — the
 * page then re-reads its normal, token-authorised status endpoint.
 */
class QrSessionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $token,
        public string $reason,
    ) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [new Channel('qr.'.$this->token)];
    }

    public function broadcastAs(): string
    {
        return 'qr.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['reason' => $this->reason];
    }
}
