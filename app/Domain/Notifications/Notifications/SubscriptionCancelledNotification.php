<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionCancelledNotification extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $planName,
        public ?string $effectiveDate = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Subscription cancelled',
            'body' => 'Your '.($this->planName ?? 'subscription').' subscription has been cancelled'
                .($this->effectiveDate ? '. Access continues until '.$this->effectiveDate : '').'.',
            'level' => 'warning',
            'url' => route('subscription.index'),
        ];
    }
}
