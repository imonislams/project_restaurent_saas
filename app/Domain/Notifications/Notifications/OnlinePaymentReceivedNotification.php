<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to branch billing staff when a customer's online payment is verified
 * server-side.
 */
class OnlinePaymentReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $orderNumber,
        public ?string $tableName,
        public float $amount,
        public string $currency,
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
            'title' => 'Online payment received',
            'body' => trim(($this->tableName ? 'Table '.$this->tableName.' · ' : '').$this->orderNumber)
                .' · '.$this->currency.' '.number_format($this->amount, 2),
            'level' => 'success',
            'order_id' => $this->orderId,
            'url' => route('orders.show', $this->orderId),
        ];
    }
}
