<?php

namespace App\Models;

use App\Domain\Branches\Models\Branch;
use App\Domain\Identity\Concerns\HasRoles;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Tenancy\Models\Tenant;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'is_platform_admin',
        'status',
        'name',
        'email',
        'phone',
        'password',
        'locale',
        'last_login_at',
        'deactivated_at',
        'avatar_path',
    ];

    /**
     * Attributes always exposed to the frontend.
     *
     * @var list<string>
     */
    protected $appends = ['avatar_url'];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'manager_pin',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_platform_admin' => 'boolean',
            'last_login_at' => 'datetime',
            'deactivated_at' => 'datetime',
        ];
    }

    /**
     * A contact is verified when either the email or the mobile number is proven.
     */
    public function hasVerifiedEmail(): bool
    {
        return $this->email_verified_at !== null || $this->phone_verified_at !== null;
    }

    public function markPhoneAsVerified(): bool
    {
        if ($this->phone_verified_at !== null) {
            return false;
        }

        return $this->forceFill(['phone_verified_at' => now()])->save();
    }

    /**
     * Whether the account was created with an email address (as opposed to mobile).
     */
    public function registersByEmail(): bool
    {
        return $this->email !== null;
    }

    /**
     * Normalise a phone number to a digits-and-leading-plus form so the same
     * number always maps to one account.
     */
    protected function phone(): Attribute
    {
        return Attribute::make(
            set: function (?string $value) {
                if ($value === null) {
                    return null;
                }

                $digits = preg_replace('/[^\d+]/', '', $value) ?? '';

                return ltrim($digits, '+') === '' ? null : '+'.ltrim($digits, '+');
            },
        );
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function phoneVerificationCodes(): HasMany
    {
        return $this->hasMany(\App\Domain\Identity\Models\PhoneVerificationCode::class);
    }

    /** Public URL of the user's profile photo (null when none is set). */
    protected function avatarUrl(): Attribute
    {
        return Attribute::get(
            fn () => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
        );
    }

    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class)
            ->withPivot('tenant_id')
            ->withTimestamps();
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->deactivated_at === null;
    }

    public function hasManagerPin(): bool
    {
        return $this->manager_pin !== null;
    }

    /**
     * Roles whose holders may access every branch in the tenant.
     */
    protected function hasTenantWideBranchAccess(): bool
    {
        return $this->isPlatformAdmin()
            || $this->hasRole([RoleName::TenantOwner, RoleName::TenantAdmin])
            || $this->hasPermission('branches.manage');
    }

    /**
     * Branch IDs this user may operate in.
     *
     * Owners/admins get every branch; everyone else gets explicitly granted branches.
     *
     * @return list<int>
     */
    public function accessibleBranchIds(): array
    {
        if ($this->hasTenantWideBranchAccess()) {
            return $this->tenant?->branches()->pluck('id')->all() ?? [];
        }

        return $this->branches()->pluck('branches.id')->all();
    }

    public function canAccessBranch(Branch|int $branch): bool
    {
        $id = $branch instanceof Branch ? $branch->getKey() : $branch;

        return in_array($id, $this->accessibleBranchIds(), true);
    }

    /**
     * Replace the user's branch access with the given branch IDs (scoped to their tenant).
     *
     * @param  list<int>  $branchIds
     */
    public function syncBranchAccess(array $branchIds): void
    {
        $valid = $this->tenant
            ? $this->tenant->branches()->whereIn('id', $branchIds)->pluck('id')->all()
            : [];

        $this->branches()->syncWithPivotValues($valid, ['tenant_id' => $this->tenant_id]);
        $this->unsetRelation('branches');
    }
}
