<?php

namespace App\Http\Controllers;

use App\Domain\Subscriptions\Enums\PlanRegion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manual pricing-region switch (Bangladesh / International). Stored in the
 * session so it overrides any detected country on the public site.
 */
class PricingRegionController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $region = $request->validate([
            'region' => ['required', 'string', Rule::in(PlanRegion::selectable())],
        ])['region'];

        $request->session()->put('pricing_region', $region);

        return back();
    }
}
