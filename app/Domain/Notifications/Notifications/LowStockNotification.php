<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LowStockNotification extends Notification
{
    use Queueable;

    /**
     * @param  list<array{name: string, quantity: float}>  $items
     */
    public function __construct(public array $items, public string $tenantName) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Low stock alert',
            'body' => count($this->items).' item(s) are at or below the reorder threshold.',
            'level' => 'warning',
            'items' => array_slice($this->items, 0, 10),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lines = collect($this->items)->take(10)->map(fn ($i) => $i['name'].' — '.$i['quantity'].' on hand');

        return (new MailMessage)
            ->subject('Low stock alert — '.$this->tenantName)
            ->line('The following items need attention:')
            ->lines($lines->all())
            ->action('Open inventory', url('/inventory'));
    }
}
