<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionActivatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $planName,
        public ?string $periodEnd = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Subscription active',
            'body' => 'Your '.($this->planName ?? 'subscription').' subscription is active'
                .($this->periodEnd ? ' and renews on '.$this->periodEnd : '').'.',
            'level' => 'success',
            'url' => route('subscription.index'),
        ];
    }
}
