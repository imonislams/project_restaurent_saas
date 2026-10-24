<?php

namespace App\Domain\Identity;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Invitation;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Notifications\StaffInvitationNotification;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Creates, sends, accepts and revokes staff invitations.
 *
 * Token handling: the plaintext token exists only long enough to build the invite
 * link; only its SHA-256 hash is persisted.
 */
class InvitationService
{
    public const EXPIRY_DAYS = 7;

    public function __construct(
        protected AuditLogger $audit,
        protected UsageService $usage,
    ) {}

    /**
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
        return DB::transaction(function () use ($invitation, $data) {
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

            // Accepting the emailed invite proves control of the address.
            $user->forceFill(['email_verified_at' => now()])->save();

            $roleIds = Role::whereIn('slug', $invitation->roles)
                ->where(function ($query) use ($invitation) {
                    $query->whereNull('tenant_id')->orWhere('tenant_id', $invitation->tenant_id);
                })
                ->pluck('id')
                ->all();
            $user->roles()->sync($roleIds);

            $this->syncBranches($user, $invitation);

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
    }

    protected function syncBranches(User $user, Invitation $invitation): void
    {
        $branchIds = collect($invitation->branch_ids ?? [])
            ->filter()
            ->unique()
            ->all();

        if ($branchIds === []) {
            return;
        }

        // Only grant branches that belong to the invitation's tenant.
        $validIds = $user->tenant
            ->branches()
            ->whereIn('id', $branchIds)
            ->pluck('id')
            ->all();

        $user->branches()->syncWithPivotValues($validIds, ['tenant_id' => $user->tenant_id]);
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
