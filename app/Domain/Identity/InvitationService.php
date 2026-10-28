<?php

namespace App\Domain\Identity;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Notifications\StaffAccountCreatedNotification;
use App\Domain\Identity\Notifications\StaffInvitationNotification;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Creates, sends, accepts and revokes staff invitations — and creates staff
 * accounts directly when the owner sets a password.
 *
 * Token handling: the plaintext token exists only long enough to build the invite
 * link; only its SHA-256 hash is persisted. A password chosen by the owner is
 * never stored in plaintext, never emailed and never written to the audit trail.
 */
class InvitationService
{
    public const EXPIRY_DAYS = 7;

    public function __construct(
        protected AuditLogger $audit,
        protected UsageService $usage,
    ) {}

    /**
     * Email an invitation link. The invitee chooses their own password.
     *
     * @param  array{email: string, name?: ?string, roles: list<string>, branch_ids?: list<int>}  $data
     */
    public function invite(Tenant $tenant, array $data, ?User $inviter = null): Invitation
    {
        $roles = $this->tenantRoleSlugs($data['roles'], $tenant->getKey());

        if ($roles === []) {
            throw ValidationException::withMessages([
                'roles' => 'Select at least one valid role.',
            ]);
        }

        $this->usage->guard($tenant, 'users');

        $plain = Invitation::generateToken();

        $invitation = $tenant->invitations()->create([
            'email' => strtolower($data['email']),
            'name' => $data['name'] ?? null,
            'roles' => $roles,
            'branch_ids' => array_values($data['branch_ids'] ?? []),
            'token' => Invitation::hashToken($plain),
            'invited_by' => $inviter?->getKey(),
            'expires_at' => now()->addDays(self::EXPIRY_DAYS),
        ]);

        $this->send($invitation, $plain);

        $this->audit->log('staff.invited', $invitation, [
            'email' => $invitation->email,
            'roles' => $roles,
        ], $inviter, $tenant->getKey());

        return $invitation;
    }

    /**
     * Create the account immediately with a password chosen by the owner. No
     * invitation is issued: the person can sign in as soon as the owner shares it.
     *
     * @param  array{email: string, name: string, password: string, roles: list<string>, branch_ids?: list<int>}  $data
     */
    public function createStaff(Tenant $tenant, array $data, ?User $inviter = null): User
    {
        $roles = $this->tenantRoleSlugs($data['roles'], $tenant->getKey());

        if ($roles === []) {
            throw ValidationException::withMessages([
                'roles' => 'Select at least one valid role.',
            ]);
        }

        $this->usage->guard($tenant, 'users');

        // Authoritative read: this decides whether the new account may sign in
        // before confirming its address, so a stale in-memory tenant must never
        // decide it.
        $settings = InvitationSettings::for($tenant->fresh() ?? $tenant);

        $user = DB::transaction(function () use ($tenant, $data, $roles, $settings, $inviter) {
            $user = User::create([
                'tenant_id' => $tenant->getKey(),
                'name' => $data['name'],
                'email' => strtolower($data['email']),
                'password' => $data['password'],
                'status' => 'active',
            ]);

            // The tenant's policy decides whether the address still has to be
            // confirmed; the password itself is never recorded anywhere.
            if (! $settings->requiresDoubleOptIn()) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $user->roles()->sync($this->roleIds($roles, $tenant->getKey()));
            $user->unsetRelation('roles');

            $this->syncBranches($user, $data['branch_ids'] ?? []);

            $this->audit->log('staff.created', $user, [
                'email' => $user->email,
                'roles' => $roles,
            ], $inviter, $tenant->getKey());

            return $user;
        });

        if ($settings->requiresDoubleOptIn()) {
            $this->sendVerification($user);
        }

        $this->sendWelcome($user, $tenant);

        return $user;
    }

    public function resend(Invitation $invitation): void
    {
        $plain = Invitation::generateToken();

        $invitation->forceFill([
            'token' => Invitation::hashToken($plain),
            'expires_at' => now()->addDays(self::EXPIRY_DAYS),
        ])->save();

        $this->send($invitation, $plain);

        $this->audit->log('staff.invitation_resent', $invitation, [
            'email' => $invitation->email,
        ]);
    }

    public function revoke(Invitation $invitation): void
    {
        $email = $invitation->email;
        $invitation->delete();

        $this->audit->log('staff.invitation_revoked', null, ['email' => $email]);
    }

    /**
     * @param  array{name: string, password: string}  $data
     */
    public function accept(Invitation $invitation, array $data): User
    {
        $settings = InvitationSettings::for($invitation->tenant);

        $user = DB::transaction(function () use ($invitation, $data, $settings) {
            if ($invitation->isAccepted()) {
                throw ValidationException::withMessages([
                    'email' => 'This invitation has already been accepted.',
                ]);
            }

            if ($invitation->isExpired()) {
                throw ValidationException::withMessages([
                    'email' => 'This invitation has expired. Please ask for a new one.',
                ]);
            }

            $user = User::create([
                'tenant_id' => $invitation->tenant_id,
                'name' => $data['name'],
                'email' => $invitation->email,
                'password' => $data['password'],
                'status' => 'active',
            ]);

            // Opening the emailed link proves control of the address, unless the
            // tenant asked for a separate confirmation step.
            if (! $settings->requiresDoubleOptIn()) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            $user->roles()->sync($this->roleIds($invitation->roles ?? [], $invitation->tenant_id));
            $user->unsetRelation('roles');

            $this->syncBranches($user, $invitation->branch_ids ?? []);

            $invitation->forceFill([
                'accepted_at' => now(),
                'accepted_user_id' => $user->getKey(),
            ])->save();

            $this->audit->log('staff.invitation_accepted', $user, [
                'email' => $user->email,
                'roles' => $invitation->roles,
            ], $user, $invitation->tenant_id);

            return $user;
        });

        if ($settings->requiresDoubleOptIn()) {
            $this->sendVerification($user);
        }

        return $user;
    }

    /** @param list<int> $branchIds */
    protected function syncBranches(User $user, array $branchIds): void
    {
        $ids = collect($branchIds)->filter()->unique()->all();

        if ($ids === []) {
            return;
        }

        // Only grants branches that belong to the user's tenant (and refreshes
        // the memoised branch access).
        $user->syncBranchAccess($ids);
    }

    /**
     * @param  list<string>  $slugs
     * @return list<int>
     */
    protected function roleIds(array $slugs, ?int $tenantId): array
    {
        return Role::whereIn('slug', $slugs)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->pluck('id')
            ->all();
    }

    /**
     * Ask the new member to confirm their address. Secondary to creating the
     * account, so a mail failure is reported, never fatal.
     */
    protected function sendVerification(User $user): void
    {
        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    protected function sendWelcome(User $user, Tenant $tenant): void
    {
        try {
            Notification::route('mail', $user->email)
                ->notify(new StaffAccountCreatedNotification($tenant, (string) $user->email, (string) $user->name));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Only tenant roles may be assigned through invitations: the global tenant
     * roles plus the inviting tenant's own custom roles. Platform roles and other
     * tenants' roles are rejected.
     *
     * @param  list<string>  $slugs
     * @return list<string>
     */
    protected function tenantRoleSlugs(array $slugs, int $tenantId): array
    {
        return Role::whereIn('slug', $slugs)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            })
            ->pluck('slug')
            ->reject(fn (string $slug) => in_array($slug, RoleName::platformValues(), true))
            ->values()
            ->all();
    }

    protected function send(Invitation $invitation, string $plainToken): void
    {
        $url = route('invitations.accept', ['token' => $plainToken]);

        Notification::route('mail', $invitation->email)
            ->notify(new StaffInvitationNotification($invitation, $url));
    }

    public function findByToken(string $token): Invitation
    {
        $invitation = Invitation::withoutGlobalScopes()
            ->where('token', Invitation::hashToken($token))
            ->first();

        if (! $invitation) {
            throw new RuntimeException('Invalid invitation token.');
        }

        return $invitation;
    }
}
