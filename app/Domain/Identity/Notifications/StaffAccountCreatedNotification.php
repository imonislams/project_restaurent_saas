<?php

namespace App\Domain\Identity\Notifications;

use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells a new team member their account exists when the owner created it with a
 * password. Deliberately carries no password and no invitation link — the owner
 * hands the password over directly.
 */
class StaffAccountCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Tenant $tenant,
        public string $email,
        public string $name,
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
        return (new MailMessage)
            ->subject('Your '.$this->tenant->name.' account is ready')
            ->greeting('Hello '.$this->name.',')
            ->line('An account has been created for you on '.$this->tenant->name.'’s Touch Dine workspace.')
            ->line('Sign in with this email address: '.$this->email)
            ->line('Your manager has your password. If you lose it, use “Forgot password” on the sign-in screen to set a new one.')
            ->line('If you were not expecting this account, you can ignore this email.');
    }
}
