<?php

namespace App\Domain\Realtime\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A platform-admin alert: money, tenants, operations, security or support.
 * Broadcast per area so a socket only receives what the admin may see; the
 * client refreshes the unread bell count from the server on receipt.
 */
class PlatformAlert implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $area,
        public string $title,
        public string $body,
        public string $level = 'info',
        public ?string $url = null,
    ) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('platform.'.$this->area)];
    }

    public function broadcastAs(): string
    {
        return 'platform.alert';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'area' => $this->area,
            'title' => $this->title,
            'body' => $this->body,
            'level' => $this->level,
            'url' => $this->url,
        ];
    }
}
