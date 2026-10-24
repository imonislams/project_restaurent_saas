<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionPaymentFailedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public float $amount,
        public string $currency,
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
            'title' => 'Payment failed',
            'body' => 'We could not process a payment of '.number_format($this->amount, 2).' '.$this->currency
                .($this->invoiceNumber ? ' for invoice '.$this->invoiceNumber : '').'. Please retry from billing.',
            'level' => 'danger',
            'url' => route('subscription.index'),
        ];
    }
}
