<?php

namespace App\Domain\Identity\Models;

use App\Domain\Identity\Enums\RoleName;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = [
        'tenant_id',
        'based_on_role_id',
        'name',
        'slug',
        'description',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
        ];
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /** The global system role a tenant copy was derived from. */
    public function source(): BelongsTo
    {
        return $this->belongsTo(self::class, 'based_on_role_id');
    }

    /** Tenant copies derived from this global system role. */
    public function derived(): HasMany
    {
        return $this->hasMany(self::class, 'based_on_role_id');
    }

    public function isGlobal(): bool
    {
        return $this->tenant_id === null;
    }

    /** Whether this row is a tenant-owned copy of a global system role. */
    public function isDerived(): bool
    {
        return $this->based_on_role_id !== null;
    }

    /**
     * Roles whose definition is owned by the platform and must never be
     * customised per tenant (name-based authorization and self-lockout).
     *
     * @return list<string>
     */
    public static function lockedSlugs(): array
    {
        return [
            RoleName::TenantOwner->value,
            RoleName::TenantAdmin->value,
        ];
    }

    public function isLocked(): bool
    {
        return $this->is_system && in_array($this->slug, self::lockedSlugs(), true);
    }

    /**
     * Roles a tenant may see and assign: the global tenant roles that this
     * tenant has not customised, plus the tenant's own roles (custom roles and
     * customised copies). Platform roles are excluded.
     */
    public function scopeAssignableTo(Builder $query, ?int $tenantId): Builder
    {
        $query
            ->where(function (Builder $query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->whereNotIn('slug', RoleName::platformValues());

        if ($tenantId !== null) {
            $query->whereNotIn('id', function ($query) use ($tenantId) {
                $query->select('based_on_role_id')
                    ->from('roles')
                    ->where('tenant_id', $tenantId)
                    ->whereNotNull('based_on_role_id');
            });
        }

        return $query;
    }

    /**
     * Resolve role slugs to ids for a tenant. When a slug points at a global
     * role the tenant has customised, the tenant copy wins so stale invitations
     * and stored assignments keep the restaurant's own permission set.
     *
     * @param  list<string>  $slugs
     * @return list<int>
     */
    public static function idsForTenant(array $slugs, ?int $tenantId): array
    {
        $roles = self::query()
            ->whereIn('slug', $slugs)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->whereNotIn('slug', RoleName::platformValues())
            ->get(['id', 'slug', 'tenant_id', 'based_on_role_id']);

        $copies = $tenantId === null
            ? collect()
            : self::query()
                ->where('tenant_id', $tenantId)
                ->whereNotNull('based_on_role_id')
                ->pluck('id', 'based_on_role_id');

        return $roles
            ->map(fn (self $role) => $role->tenant_id === null && $copies->has($role->getKey())
                ? $copies->get($role->getKey())
                : $role->getKey())
            ->unique()
            ->values()
            ->all();
    }

    public function hasPermission(string $slug): bool
    {
        return $this->permissions->contains('slug', $slug);
    }
}
