<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ShiftVarianceNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $tenantName,
        public string $branchName,
        public float $expected,
        public float $counted,
        public float $variance,
        public string $currency = 'USD',
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Cash discrepancy on shift close',
            'body' => $this->branchName.' closed '.($this->variance < 0 ? 'short' : 'over').' by '
                .number_format(abs($this->variance), 2).'.',
            'level' => 'danger',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Cash variance — '.$this->branchName)
            ->line('Expected '.$this->currency.' '.number_format($this->expected, 2).', counted '.$this->currency.' '.number_format($this->counted, 2).'.')
            ->line('Variance: '.$this->currency.' '.number_format($this->variance, 2).'.');
    }
}
