<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionRenewalReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $planName,
        public ?string $dueDate = null,
        public ?float $amount = null,
        public ?string $currency = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Renewal due',
            'body' => 'Your '.($this->planName ?? 'subscription').' subscription needs renewing'
                .($this->dueDate ? ' by '.$this->dueDate : '')
                .($this->amount !== null && $this->currency !== null ? '. Amount: '.number_format($this->amount, 2).' '.$this->currency : '').'.',
            'level' => 'warning',
            'url' => route('subscription.index'),
        ];
    }
}
