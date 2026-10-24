<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RefundProcessedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public float $amount,
        public string $currency,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Refund processed',
            'body' => 'A refund of '.number_format($this->amount, 2).' '.$this->currency.' has been recorded on your account.',
            'level' => 'info',
            'url' => route('subscription.index'),
        ];
    }
}
