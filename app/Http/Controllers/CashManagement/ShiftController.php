<?php

namespace App\Http\Controllers\CashManagement;

use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\CashService;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\CashManagement\ShiftService;
use App\Http\Controllers\Controller;
use App\Http\Requests\CashManagement\CashMovementRequest;
use App\Http\Requests\CashManagement\CloseShiftRequest;
use App\Http\Requests\CashManagement\OpenShiftRequest;
use Illuminate\Http\RedirectResponse;

class ShiftController extends Controller
{
    public function __construct(
        protected ShiftService $shifts,
        protected CashService $cash,
    ) {}

    public function open(OpenShiftRequest $request): RedirectResponse
    {
        $branch = Branch::query()->findOrFail($request->validated('branch_id'));

        $this->shifts->open(
            $branch,
            $request->user(),
            (float) $request->validated('opening_float'),
            $request->validated('register_id'),
        );

        return back()->with('success', 'Shift opened.');
    }

    public function close(CloseShiftRequest $request, Shift $shift): RedirectResponse
    {
        $this->shifts->close(
            $shift,
            $request->user(),
            (float) $request->validated('counted_cash'),
            $request->validated('manager_pin'),
            $request->validated('notes'),
        );

        return back()->with('success', 'Shift closed.');
    }

    public function movement(CashMovementRequest $request, Shift $shift): RedirectResponse
    {
        $amount = (float) $request->validated('amount');
        $reason = $request->validated('reason');

        if ($request->validated('direction') === 'in') {
            $this->cash->cashIn($shift, $amount, $reason);
        } else {
            $this->cash->cashOut($shift, $amount, $reason ?? 'Cash out');
        }

        return back()->with('success', 'Cash movement recorded.');
    }
}
