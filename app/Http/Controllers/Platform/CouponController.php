<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Subscriptions\Models\Coupon;
use App\Domain\Subscriptions\Models\Plan;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CouponController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Platform/Coupons', [
            'coupons' => Coupon::query()
                ->with('appliesToPlan:id,name')
                ->withCount('redemptions')
                ->latest('id')
                ->get()
                ->map(fn (Coupon $coupon) => [
                    'id' => $coupon->getKey(),
                    'code' => $coupon->code,
                    'type' => $coupon->type->value,
                    'type_label' => $coupon->type->label(),
                    'value' => (float) $coupon->value,
                    'currency' => $coupon->currency,
                    'max_redemptions' => $coupon->max_redemptions,
                    'redeemed_count' => $coupon->redeemed_count,
                    'redemptions_count' => $coupon->redemptions_count,
                    'applies_to' => $coupon->appliesToPlan?->name,
                    'valid_from' => $coupon->valid_from?->toIso8601String(),
                    'valid_to' => $coupon->valid_to?->toIso8601String(),
                    'is_active' => $coupon->is_active,
                    'auto_apply' => $coupon->auto_apply,
                    'first_purchase_only' => $coupon->first_purchase_only,
                    'min_amount' => $coupon->min_amount !== null ? (float) $coupon->min_amount : null,
                    'per_tenant_limit' => $coupon->per_tenant_limit,
                    'applies_to_plan_ids' => $coupon->applies_to_plan_ids ?? [],
                ]),
            'plans' => Plan::query()->orderBy('sort_order')->get(['id', 'name'])
                ->map(fn (Plan $plan) => ['value' => (string) $plan->getKey(), 'label' => $plan->name])->all(),
            'currencies' => collect(config('platform.currencies'))
                ->map(fn ($label, $code) => ['value' => $code, 'label' => $label])->values()->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Coupon::create($this->validated($request));

        return back()->with('success', 'Coupon created.');
    }

    public function update(Request $request, Coupon $coupon): RedirectResponse
    {
        $coupon->update($this->validated($request, $coupon));

        return back()->with('success', 'Coupon updated.');
    }

    public function destroy(Coupon $coupon): RedirectResponse
    {
        if ($coupon->redemptions()->exists()) {
            $coupon->forceFill(['is_active' => false])->save();

            return back()->with('success', 'Coupon has redemptions and was deactivated instead of deleted.');
        }

        $coupon->delete();

        return back()->with('success', 'Coupon deleted.');
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request, ?Coupon $coupon = null): array
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:60', Rule::unique('coupons', 'code')->ignore($coupon?->getKey())],
            'type' => ['required', Rule::in(['percent', 'fixed'])],
            'value' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'max_redemptions' => ['nullable', 'integer', 'min:1'],
            'applies_to_plan_id' => ['nullable', 'integer', Rule::exists('plans', 'id')],
            'applies_to_plan_ids' => ['nullable', 'array'],
            'applies_to_plan_ids.*' => ['integer', Rule::exists('plans', 'id')],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'is_active' => ['boolean'],
            'auto_apply' => ['boolean'],
            'first_purchase_only' => ['boolean'],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'per_tenant_limit' => ['nullable', 'integer', 'min:1'],
        ]);

        $data['code'] = strtoupper(trim($data['code']));

        // Create-time defaults only; partial updates must not wipe other fields.
        if ($coupon === null) {
            $data['is_active'] = $data['is_active'] ?? true;
        }

        if (array_key_exists('currency', $data) && $data['currency'] !== null) {
            $data['currency'] = strtoupper($data['currency']);
        }

        return $data;
    }
}
