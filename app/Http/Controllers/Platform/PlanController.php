<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\GatewayProviderRegistry;
use App\Domain\Subscriptions\Enums\PlanFeature;
use App\Domain\Subscriptions\Enums\PlanVisibility;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\PlanService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller
{
    public function __construct(protected PlanService $plans) {}

    public function index(): Response
    {
        $settings = app(\App\Domain\PlatformSettings\PlatformSettings::class);
        $defaultCurrency = $settings->get('billing.default_currency')
            ?? $settings->get('general.default_currency')
            ?? config('platform.reporting_currency', 'USD');

        $enabledCurrencies = $settings->enabledCurrencies();

        return Inertia::render('Platform/Plans', [
            'plans' => Plan::query()
                ->with(['prices', 'gateways'])
                ->withCount('subscriptions')
                ->orderBy('sort_order')
                ->get()
                ->map(fn (Plan $plan) => $this->row($plan)),
            'currencies' => collect(config('platform.currencies'))
                ->filter(fn ($label, $code) => in_array(strtoupper((string) $code), $enabledCurrencies, true))
                ->map(fn ($label, $code) => ['value' => $code, 'label' => $code.' — '.$label])
                ->values()
                ->all(),
            'enabled_currencies' => $enabledCurrencies,
            'default_currency' => $defaultCurrency,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Platform/Plans/Form', $this->formProps());
    }

    public function edit(Plan $plan): Response
    {
        $plan->load(['prices', 'gateways'])->loadCount('subscriptions');

        return Inertia::render('Platform/Plans/Form', $this->formProps($this->row($plan)));
    }

    public function store(Request $request): RedirectResponse
    {
        $this->plans->create($this->validated($request), $request->user());

        return back()->with('success', 'Plan created.');
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $this->plans->update($plan, $this->validated($request, $plan), $request->user());

        return back()->with('success', 'Plan updated. Existing subscriptions keep their captured terms.');
    }

    public function archive(Request $request, Plan $plan): RedirectResponse
    {
        $this->plans->archive($plan, $request->user());

        return back()->with('success', 'Plan archived — no longer assignable, existing subscriptions unaffected.');
    }

    public function destroy(Request $request, Plan $plan): RedirectResponse
    {
        // Throws a validation exception (with a message) when subscriptions exist.
        $this->plans->delete($plan, $request->user());

        return back()->with('success', 'Plan deleted.');
    }

    /** @return array<string, mixed> */
    protected function formProps(?array $plan = null): array
    {
        $settings = app(\App\Domain\PlatformSettings\PlatformSettings::class);
        $defaultCurrency = $settings->get('billing.default_currency')
            ?? $settings->get('general.default_currency')
            ?? config('platform.reporting_currency', 'USD');

        $enabledCurrencies = $settings->enabledCurrencies();

        return [
            'plan' => $plan,
            'currencies' => collect(config('platform.currencies'))
                ->filter(fn ($label, $code) => in_array(strtoupper((string) $code), $enabledCurrencies, true))
                ->map(fn ($label, $code) => ['value' => $code, 'label' => $code.' — '.$label])
                ->values()
                ->all(),
            'enabled_currencies' => $enabledCurrencies,
            'default_currency' => $defaultCurrency,
            'feature_options' => PlanFeature::options(),
            'limit_keys' => [
                ['key' => 'branches', 'label' => 'Branches', 'hint' => 'Number of restaurant locations allowed'],
                ['key' => 'users', 'label' => 'Users', 'hint' => 'Staff accounts allowed'],
                ['key' => 'orders_this_month', 'label' => 'Orders / month', 'hint' => 'Sales allowed per month'],
            ],
            'gateways' => PaymentGateway::query()
                ->orderBy('provider')
                ->orderBy('sort_order')
                ->get()
                ->map(fn (PaymentGateway $gateway) => ['value' => (string) $gateway->getKey(), 'label' => $gateway->displayName()])
                ->values()
                ->all(),
            'price_providers' => collect(app(GatewayProviderRegistry::class)->priceProviders())
                ->map(fn (string $provider) => ['value' => $provider, 'label' => app(GatewayProviderRegistry::class)->label($provider)])
                ->values()
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function row(Plan $plan): array
    {
        return [
            'id' => $plan->getKey(),
            'name' => $plan->name,
            'slug' => $plan->slug,
            'description' => $plan->description,
            'currency' => $plan->currency,
            'price_monthly' => (float) $plan->price_monthly,
            'price_yearly' => (float) $plan->price_yearly,
            'trial_days' => $plan->trial_days,
            'features' => $plan->features ?? [],
            'limits' => $plan->limits ?? [],
            'is_active' => $plan->is_active,
            'visibility' => $plan->visibility->value,
            'version' => $plan->version,
            'archived' => $plan->isArchived(),
            'subscriptions_count' => $plan->subscriptions_count,
            'prices' => $plan->prices->map(fn ($price) => [
                'currency' => $price->currency,
                'interval' => $price->interval,
                'price' => (float) $price->price,
                'provider_prices' => $price->provider_prices ?? [],
            ])->values()->all(),
            'gateway_ids' => $plan->gateways->pluck('id')->map(fn ($id) => (string) $id)->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function validated(Request $request, ?Plan $plan = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('plans', 'slug')->ignore($plan?->getKey())],
            'description' => ['nullable', 'string', 'max:255'],
            'currency' => ['required', 'string', 'size:3'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_yearly' => ['required', 'numeric', 'min:0'],
            'trial_days' => ['required', 'integer', 'min:0', 'max:365'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:50'],
            'limits' => ['nullable', 'array'],
            'limits.branches' => ['nullable', 'integer', 'min:0'],
            'limits.users' => ['nullable', 'integer', 'min:0'],
            'limits.orders_this_month' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'visibility' => ['required', Rule::in(PlanVisibility::values())],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'prices' => ['nullable', 'array'],
            'prices.*.currency' => ['required', 'string', 'size:3'],
            'prices.*.interval' => ['required', Rule::in(['monthly', 'yearly'])],
            'prices.*.price' => ['required', 'numeric', 'min:0'],
            'prices.*.provider_prices' => ['nullable', 'array'],
            'gateways' => ['nullable', 'array'],
            'gateways.*' => ['integer', 'exists:payment_gateways,id'],
        ]);

        // Only apply create-time defaults on store; partial updates must not wipe
        // fields the caller did not send.
        if ($plan === null) {
            $data['features'] = $data['features'] ?? [];
            $data['limits'] = $data['limits'] ?? [];
            $data['sort_order'] = $data['sort_order'] ?? 0;
            $data['is_active'] = $data['is_active'] ?? true;
        }

        $data['currency'] = strtoupper($data['currency']);

        return $data;
    }
}
