<?php

namespace App\Domain\Realtime\Events;

use App\Domain\Orders\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * An order moved through its staff lifecycle (accepted, rejected, voided,
 * served) — keeps an open Orders list or detail page in step without a reload.
 */
class OrderActivity implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public string $action,
    ) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('tenant.'.$this->order->tenant_id.'.orders')];
    }

    public function broadcastAs(): string
    {
        return 'order.activity';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->getKey(),
            'order_number' => $this->order->order_number,
            'branch_id' => $this->order->branch_id,
            'action' => $this->action,
            'status' => $this->order->status?->value,
        ];
    }
}
