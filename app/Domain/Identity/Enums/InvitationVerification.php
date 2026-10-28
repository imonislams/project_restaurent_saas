<?php

namespace App\Domain\Identity\Enums;

/**
 * How an invited team member's email address is verified.
 *
 * The policy is applied when the account is created (by accepting an invitation
 * or by the owner setting a password) and never retroactively.
 */
enum InvitationVerification: string
{
    /** Opening the emailed invitation proves the address; a password-created account is treated as confirmed. */
    case InviteLink = 'invite_link';

    /** The new member must confirm a verification email before entering the workspace. */
    case EmailLink = 'email_link';

    /** The owner vouches for invited staff; no verification step. */
    case None = 'none';

    public function requiresDoubleOptIn(): bool
    {
        return $this === self::EmailLink;
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
