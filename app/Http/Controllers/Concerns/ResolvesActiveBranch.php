<?php

namespace App\Http\Controllers\Concerns;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Http\Request;

/**
 * Reads the active branch resolved for the request by ResolveActiveBranch.
 */
trait ResolvesActiveBranch
{
    protected function activeBranch(Request $request): ?Branch
    {
        $branch = $request->attributes->get('active_branch');

        if ($branch instanceof Branch) {
            return $branch;
        }

        $id = app(TenantContext::class)->branchId();

        return $id ? Branch::query()->find($id) : null;
    }
}
