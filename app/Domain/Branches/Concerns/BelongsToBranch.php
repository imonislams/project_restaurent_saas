<?php

namespace App\Domain\Branches\Concerns;

use App\Domain\Branches\Support\BranchScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Applies fail-closed branch scoping to a branch-owned model.
 *
 * Adds a global scope that constrains queries to the current user's accessible
 * branches (owners/admins are unrestricted). Because route model binding runs
 * through global scopes, a record from a branch the user cannot access resolves
 * to a 404. Override branchScopeAllowsNull() where a null branch means
 * "company-wide".
 */
trait BelongsToBranch
{
    public static function bootBelongsToBranch(): void
    {
        static::addGlobalScope('branch', function (Builder $builder): void {
            BranchScope::apply($builder, 'branch_id', static::branchScopeAllowsNull());
        });
    }

    protected static function branchScopeAllowsNull(): bool
    {
        return false;
    }
}
