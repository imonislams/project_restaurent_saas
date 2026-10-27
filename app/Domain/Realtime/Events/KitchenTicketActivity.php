<?php

namespace App\Domain\Realtime\Events;

use App\Domain\Kitchen\Models\KitchenTicket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A kitchen ticket opened or changed status. Goes to the kitchen board (which
 * otherwise refreshes every 12 seconds) and to the Orders channel so an open
 * order list stays in step. Auto-accepted orders produce this even though they
 * create no in-app notification.
 */
class KitchenTicketActivity implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public KitchenTicket $ticket,
        public string $status,
    ) {}

    /** @return array<int, \Illuminate\Broadcasting\Channel> */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tenant.'.$this->ticket->tenant_id.'.kitchen'),
            new PrivateChannel('tenant.'.$this->ticket->tenant_id.'.orders'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'kitchen.ticket';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticket->getKey(),
            'status' => $this->status,
            'branch_id' => $this->ticket->branch_id,
            'order_number' => $this->ticket->order?->order_number,
            'items' => $this->ticket->items()->count(),
        ];
    }
}
