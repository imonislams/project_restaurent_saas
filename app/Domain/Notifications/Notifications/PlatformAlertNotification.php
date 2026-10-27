<?php

namespace App\Domain\Notifications\Notifications;

use Illuminate\Notifications\Notification;

/**
 * An in-app alert for platform administrators. Same payload shape as the
 * tenant notifications (title/body/level/url) so the bell renders both alike.
 */
class PlatformAlertNotification extends Notification
{
    public function __construct(
        public string $title,
        public string $body,
        public string $level = 'info',
        public ?string $url = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'level' => $this->level,
            'url' => $this->url,
        ];
    }
}
