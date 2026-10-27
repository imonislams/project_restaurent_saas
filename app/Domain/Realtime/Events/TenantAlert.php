<?php

namespace App\Domain\Realtime\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A staff-side tenant alert (billing, inventory, orders…). Broadcast per area on
 * the tenant channel the corresponding screen already authorises.
 */
class TenantAlert implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $tenantId,
        public string $area,
        public string $title,
        public string $body,
        public string $level = 'info',
        public ?int $branchId = null,
    ) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('tenant.'.$this->tenantId.'.'.$this->area)];
    }

    public function broadcastAs(): string
    {
        return 'tenant.alert';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'area' => $this->area,
            'title' => $this->title,
            'body' => $this->body,
            'level' => $this->level,
            'branch_id' => $this->branchId,
        ];
    }
}
