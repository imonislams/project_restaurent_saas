<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Persists the user's active branch choice for the session.
 *
 * The choice is validated server-side against the user's accessible branches;
 * an inaccessible branch is rejected (never silently ignored).
 */
class BranchSwitchController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer'],
        ]);

        $user = $request->user();
        $branchId = (int) $validated['branch_id'];

        abort_unless($user && $user->canAccessBranch($branchId), 403);

        $request->session()->put('active_branch_id', $branchId);

        return back();
    }
}
