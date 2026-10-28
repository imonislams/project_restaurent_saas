<?php

namespace App\Domain\Identity;

use App\Domain\Identity\Enums\InvitationVerification;
use App\Domain\Tenancy\Models\Tenant;

/**
 * Typed access to the tenant's invitation verification policy. Reads the stored
 * setting server-side and falls back to the safe default (the invitation link
 * confirms the address), so a missing or corrupt value can never open the
 * workspace to unverified accounts.
 */
class InvitationSettings
{
    public function __construct(protected Tenant $tenant) {}

    public static function for(Tenant $tenant): self
    {
        return new self($tenant);
    }

    public function mode(): InvitationVerification
    {
        $value = $this->tenant->getSetting('invitations.verification');

        if (! is_string($value)) {
            return InvitationVerification::InviteLink;
        }

        return InvitationVerification::tryFrom($value) ?? InvitationVerification::InviteLink;
    }

    /** Whether a new account must confirm its email before it can sign in. */
    public function requiresDoubleOptIn(): bool
    {
        return $this->mode()->requiresDoubleOptIn();
    }

    /** @return array{mode: string} */
    public function toArray(): array
    {
        return ['mode' => $this->mode()->value];
    }
}
