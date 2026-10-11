<?php

namespace App\Http\Controllers\Loyalty;

use App\Domain\Customers\Models\Customer;
use App\Domain\Loyalty\LoyaltyService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function __construct(protected LoyaltyService $loyalty) {}

    public function adjust(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate([
            'points' => ['required', 'integer', 'not_in:0'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $points = (int) $data['points'];

        if ($points > 0) {
            $this->loyalty->earn($customer, $points, null, $data['reason'] ?? 'Manual points', $request->user());
        } else {
            $this->loyalty->adjust($customer, $points, $data['reason'] ?? 'Manual adjustment', $request->user());
        }

        return back()->with('success', 'Loyalty points updated.');
    }
}
