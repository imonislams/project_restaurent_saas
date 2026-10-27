<?php

namespace App\Domain\Realtime\Events;

use App\Domain\Orders\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A QR / self-service order is waiting for staff confirmation. Sent the moment
 * the order is placed, so the Orders badge, toast and chime are instant instead
 * of arriving on the 15-second poll.
 */
class OrderAwaitingApproval implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Order $order) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('tenant.'.$this->order->tenant_id.'.approvals')];
    }

    public function broadcastAs(): string
    {
        return 'order.awaiting_approval';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->getKey(),
            'order_number' => $this->order->order_number,
            'branch_id' => $this->order->branch_id,
            'table' => $this->order->table?->name,
            'total' => (float) $this->order->total,
            'currency' => $this->order->currency,
            'items' => $this->order->items()->count(),
        ];
    }
}
