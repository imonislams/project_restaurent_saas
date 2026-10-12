<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to staff who can approve orders when a QR order arrives and needs
 * confirmation before it reaches the kitchen.
 */
class QrOrderPlacedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $orderNumber,
        public string $tableName,
        public float $total,
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
            'title' => 'New QR order — approval needed',
            'body' => 'Table '.$this->tableName.' · '.$this->orderNumber.' · '.$this->currency.' '.number_format($this->total, 2),
            'level' => 'info',
            'order_id' => $this->orderId,
            'url' => route('orders.index', ['source' => 'qr']),
        ];
    }
}
