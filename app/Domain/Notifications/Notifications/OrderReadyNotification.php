<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the order's assigned staff when the kitchen marks the food ready.
 */
class OrderReadyNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $orderNumber,
        public ?string $tableName,
        public int $orderId,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Food ready for pickup',
            'body' => trim(($this->tableName ? 'Table '.$this->tableName.' · ' : '').$this->orderNumber),
            'level' => 'info',
            'order_id' => $this->orderId,
            'url' => route('orders.show', $this->orderId),
        ];
    }
}
