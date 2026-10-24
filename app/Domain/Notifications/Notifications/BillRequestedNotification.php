<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to branch billing staff when a customer requests the bill via QR.
 */
class BillRequestedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $tableName,
        public float $payableTotal,
        public string $currency,
        public int $sessionId,
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
            'title' => 'Bill requested',
            'body' => 'Table '.($this->tableName ?? '—').' · '.$this->currency.' '.number_format($this->payableTotal, 2),
            'level' => 'warning',
            'session_id' => $this->sessionId,
            'url' => route('invoices.index'),
        ];
    }
}
