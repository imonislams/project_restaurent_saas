<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionPaymentSucceededNotification extends Notification
{
    use Queueable;

    public function __construct(
        public float $amount,
        public string $currency,
        public string $gateway,
        public ?string $invoiceNumber = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Payment received',
            'body' => 'A payment of '.number_format($this->amount, 2).' '.$this->currency.' via '.$this->gateway
                .($this->invoiceNumber ? ' for invoice '.$this->invoiceNumber : '').' was verified.',
            'level' => 'success',
            'url' => route('subscription.index'),
        ];
    }
}
