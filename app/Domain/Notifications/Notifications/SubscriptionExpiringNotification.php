<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiringNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $tenantName,
        public ?string $planName,
        public ?int $daysRemaining,
        public bool $onTrial = false,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->onTrial ? 'Trial ending soon' : 'Subscription renewing soon',
            'body' => ($this->onTrial ? 'Your trial' : 'Your '.$this->planName.' plan')
                .' ends in '.($this->daysRemaining ?? 0).' day(s).',
            'level' => 'warning',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Action needed — subscription ending soon')
            ->line('Your subscription for '.$this->tenantName.' ends in '.($this->daysRemaining ?? 0).' day(s).')
            ->action('Manage subscription', url('/dashboard'));
    }
}
