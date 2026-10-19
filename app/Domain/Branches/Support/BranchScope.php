<?php

namespace App\Domain\Branches\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Resolves and applies branch scoping for the current request.
 *
 * Returns null (unrestricted) when there is no authenticated user — background
 * jobs, console commands and the public QR flow (which binds its own branch
 * context) — or when the user has tenant-wide branch access (owner, admin or
 * `branches.manage`). Otherwise queries are constrained to the user's accessible
 * branches; an empty set fails closed (no rows).
 */
final class BranchScope
{
    /** @return list<int>|null null means "do not constrain". */
    public static function accessibleBranchIds(): ?array
    {
        $user = auth()->user();

        if (! $user) {
            return null;
        }

        if ($user->hasTenantWideBranchAccess()) {
            return null;
        }

        return $user->accessibleBranchIds();
    }

    /**
     * Constrain a query to the accessible branches.
     *
     * @param  bool  $allowNull  treat a null branch as company-wide (visible to all)
     */
    public static function apply(Builder $builder, string $column = 'branch_id', bool $allowNull = false): void
    {
        $ids = static::accessibleBranchIds();

        if ($ids === null) {
            return;
        }

        // Fail closed: no accessible branches means no rows.
        if ($ids === []) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $qualified = $builder->getModel()->getTable().'.'.$column;

        if ($allowNull) {
            $builder->where(function (Builder $query) use ($qualified, $ids): void {
                $query->whereIn($qualified, $ids)->orWhereNull($qualified);
            });

            return;
        }

        $builder->whereIn($qualified, $ids);
    }
}
