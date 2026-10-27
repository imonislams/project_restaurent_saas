<?php

namespace App\Domain\Realtime\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sent from the Real-time settings screen to prove the configured driver
 * actually delivers, not merely that credentials were saved.
 */
class RealtimeTestEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $userId,
        public string $message,
        public string $sentAt,
    ) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('App.Models.User.'.$this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'realtime.test';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'sent_at' => $this->sentAt,
        ];
    }
}
