<?php

namespace App\Listeners;

use App\Domain\Notifications\PlatformNotificationService;
use App\Domain\Security\SecurityEventLogger;
use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Support\Facades\Cache;

/**
 * Records authentication events (successful login, failed attempt, logout), and
 * alerts the administrators when a *platform admin* account fails to sign in —
 * ordinary failed logins and bot traffic are only recorded.
 */
class RecordAuthSecurityEvents
{
    public function __construct(protected SecurityEventLogger $events) {}

    public function login(Login $event): void
    {
        $this->events->record('login', $event->user, null, ['guard' => $event->guard]);
    }

    public function failed(Failed $event): void
    {
        $email = $event->credentials['email'] ?? null;

        $this->events->record('login_failed', null, is_string($email) ? $email : null, ['guard' => $event->guard]);

        $this->alertAdminSignInFailure(is_string($email) ? $email : null);
    }

    public function logout(Logout $event): void
    {
        $this->events->record('logout', $event->user, null, ['guard' => $event->guard]);
    }

    protected function alertAdminSignInFailure(?string $email): void
    {
        if ($email === null || trim($email) === '') {
            return;
        }

        $exists = User::query()
            ->where('email', $email)
            ->where('is_platform_admin', true)
            ->exists();

        if (! $exists) {
            return;
        }

        // One alert per account per ten minutes: a brute-force attempt must not
        // turn into a notification flood.
        if (! Cache::add('platform-alert:admin-login-failed:'.mb_strtolower($email), true, now()->addMinutes(10))) {
            return;
        }

        try {
            app(PlatformNotificationService::class)->send(
                'security',
                'platform.security.view',
                'Failed sign-in on an admin account',
                $email.' — a failed login was recorded for a platform administrator.',
                'warning',
                route('platform.security.index'),
            );
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
