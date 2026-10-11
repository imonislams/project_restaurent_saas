<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SalesSummaryNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $tenantName,
        public string $date,
        public int $orders,
        public float $netSales,
        public string $currency,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Daily sales summary',
            'body' => $this->orders.' orders · net '.$this->currency.' '.number_format($this->netSales, 2).' on '.$this->date,
            'level' => 'info',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Daily sales summary — '.$this->date)
            ->line($this->tenantName.' recorded '.$this->orders.' orders.')
            ->line('Net sales (excl. tax): '.$this->currency.' '.number_format($this->netSales, 2).'.')
            ->action('Open reports', url('/reports'));
    }
}
