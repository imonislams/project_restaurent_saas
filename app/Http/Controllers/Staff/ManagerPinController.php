<?php

namespace App\Http\Controllers\Staff;

use App\Domain\Identity\ManagerPinService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\ManagerPinRequest;
use Illuminate\Http\RedirectResponse;

class ManagerPinController extends Controller
{
    public function __construct(protected ManagerPinService $pins) {}

    public function update(ManagerPinRequest $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless(
            $this->pins->canApprove($user),
            403,
            'Your role is not authorized to approve sensitive actions.',
        );

        $this->pins->set($user, $request->validated('pin'));

        return back()->with('success', 'Manager PIN saved.');
    }
}
