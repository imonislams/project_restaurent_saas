<?php

namespace App\Domain\Notifications;

use App\Domain\Notifications\Notifications\PlatformAlertNotification;
use App\Domain\Realtime\Events\PlatformAlert;
use App\Domain\Realtime\RealtimeBroadcaster;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * Alerts for the platform administrators.
 *
 * Delivery is two-fold and best-effort: a database notification (the bell and
 * the Notifications page) for every admin holding the area's permission, and a
 * live event on that area's channel so the badge updates immediately. Neither
 * may break the business action that triggered it.
 */
class PlatformNotificationService
{
    public function __construct(protected RealtimeBroadcaster $broadcaster) {}

    /**
     * Platform admins holding a permission, e.g. "platform.payments.view".
     *
     * @return Collection<int, User>
     */
    public function recipients(string $permission): Collection
    {
        return User::query()
            ->where('is_platform_admin', true)
            ->where('status', 'active')
            ->get()
            ->filter(fn (User $user) => $user->hasPermission($permission))
            ->values();
    }

    public function send(
        string $area,
        string $permission,
        string $title,
        string $body,
        string $level = 'info',
        ?string $url = null,
    ): int {
        $recipients = $this->recipients($permission);

        if ($recipients->isNotEmpty()) {
            try {
                Notification::send($recipients, new PlatformAlertNotification($title, $body, $level, $url));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $this->broadcaster->send(new PlatformAlert($area, $title, $body, $level, $url), 'platform');

        return $recipients->count();
    }
}
