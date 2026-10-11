<?php

namespace App\Listeners;

use App\Domain\Security\SecurityEventLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Records authentication events (successful login, failed attempt, logout).
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
    }

    public function logout(Logout $event): void
    {
        $this->events->record('logout', $event->user, null, ['guard' => $event->guard]);
    }
}
