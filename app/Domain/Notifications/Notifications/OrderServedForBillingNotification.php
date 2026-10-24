<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to branch billing users when a served order enters the Bill/Invoice
 * workflow.
 */
class OrderServedForBillingNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $invoiceNumber,
        public ?string $tableName,
        public float $total,
        public string $currency,
        public int $invoiceId,
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
            'title' => 'Order served — bill ready',
            'body' => trim(($this->tableName ? 'Table '.$this->tableName.' · ' : '').$this->invoiceNumber)
                .' · '.$this->currency.' '.number_format($this->total, 2),
            'level' => 'info',
            'invoice_id' => $this->invoiceId,
            'url' => route('invoices.show', $this->invoiceId),
        ];
    }
}
