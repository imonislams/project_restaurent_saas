<?php

namespace App\Domain\Identity\Notifications;

use App\Domain\Identity\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class StaffInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Invitation $invitation,
        public string $url,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $restaurant = $this->invitation->tenant?->name ?? 'a restaurant';

        return (new MailMessage)
            ->subject('You are invited to join '.$restaurant)
            ->greeting('Hello'.($this->invitation->name ? ' '.$this->invitation->name : '').',')
            ->line('You have been invited to join '.$restaurant.' on the Restaurant POS platform.')
            ->action('Accept invitation', $this->url)
            ->line('This invitation expires on '.$this->invitation->expires_at->toDayDateTimeString().'.')
            ->line('If you were not expecting this invitation, you can ignore this email.');
    }
}
