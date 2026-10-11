<?php

namespace App\Domain\Security;

use App\Domain\Security\Models\SecurityEvent;
use App\Models\User;

/**
 * Records authentication and security events for the security center. Never
 * throws so a logging failure cannot break an authentication flow.
 */
class SecurityEventLogger
{
    /** @param array<string, mixed> $meta */
    public function record(string $event, ?User $user = null, ?string $email = null, array $meta = []): ?SecurityEvent
    {
        try {
            return SecurityEvent::create([
                'event' => $event,
                'user_id' => $user?->getKey(),
                'email' => $email ?? $user?->email,
                'ip' => request()->ip(),
                'user_agent' => mb_substr((string) request()->userAgent(), 0, 255),
                'meta' => $meta !== [] ? $meta : null,
            ]);
        } catch (\Throwable) {
            return null;
        }
    }
}
