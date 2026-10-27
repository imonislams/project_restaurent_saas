<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\GatewayProviderRegistry;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Domain\Subscriptions\Models\Plan;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform admin configuration for the SaaS subscription payment gateways.
 * Multiple named gateways may be enabled at once; each has independent
 * credentials, environments and availability rules. Secrets are encrypted at
 * rest and only their keys are ever returned to the browser.
 */
class GatewayController extends Controller
{
    public function __construct(
        protected PlatformGatewayManager $gateways,
        protected GatewayProviderRegistry $registry,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        return $this->listing($request->string('provider')->toString() ?: null);
    }

    public function sslcommerz(): Response
    {
        return $this->listing('sslcommerz');
    }

    protected function listing(?string $providerFilter): Response
    {
        $plans = Plan::query()->orderBy('sort_order')->get(['id', 'name']);

        return Inertia::render('Platform/Gateways/Index', [
            'gateways' => $this->gateways->all()
                ->when($providerFilter, fn ($configs) => $configs->where('provider', $providerFilter)->values())
                ->map(fn (PaymentGateway $gateway) => $this->row($gateway))
                ->values(),
            'provider_filter' => $providerFilter,
            'providers' => $this->registry->providers(),
            'provider_labels' => collect($this->registry->providers())
                ->mapWithKeys(fn (string $provider) => [$provider => $this->registry->label($provider)])
                ->all(),
            'provider_schema' => $this->registry->schema(),
            'required_credentials' => collect($this->registry->providers())
                ->mapWithKeys(fn (string $provider) => [$provider => $this->registry->requiredCredentialKeys($provider)])
                ->all(),
            'capabilities' => $this->registry->capabilityOptions(),
            'currencies' => collect(config('platform.currencies'))->map(fn ($label, $code) => ['value' => $code, 'label' => $code.' — '.$label])->values()->all(),
            'countries' => collect(config('geo.countries'))->map(fn ($name, $code) => ['value' => $code, 'label' => $name])->values()->all(),
            'plans' => $plans->map(fn (Plan $plan) => ['value' => (string) $plan->getKey(), 'label' => $plan->name])->values()->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request, creating: true);

        $gateway = PaymentGateway::create([
            'name' => $data['name'] ?? null,
            'provider' => $data['provider'],
            'environment' => $data['environment'],
            'is_enabled' => $data['is_enabled'] ?? false,
            'supported_currencies' => array_map('strtoupper', $data['supported_currencies'] ?? []),
            'credentials' => array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== ''),
            'settings' => [
                'allowed_countries' => array_map('strtoupper', $data['allowed_countries'] ?? []),
                'capabilities' => $data['capabilities'] ?? [],
            ],
        ]);

        $gateway->plans()->sync($data['plan_ids'] ?? []);

        $this->audit->log('platform.gateway_created', $gateway, ['provider' => $gateway->provider, 'name' => $gateway->name], $request->user());

        return back()->with('success', 'Gateway configuration created.');
    }

    public function update(Request $request, PaymentGateway $gateway): RedirectResponse
    {
        $data = $this->validated($request, creating: false);

        // Only overwrite credential keys the operator actually supplied.
        $supplied = array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');

        $gateway->forceFill([
            'name' => $data['name'] ?? $gateway->name,
            'provider' => $data['provider'],
            'environment' => $data['environment'],
            // The enable switch owns this state; a PATCH that omits the flag must
            // not silently disable a live gateway.
            'is_enabled' => $data['is_enabled'] ?? $gateway->is_enabled,
            'supported_currencies' => array_map('strtoupper', $data['supported_currencies'] ?? []),
            'credentials' => array_merge($gateway->credentials ?? [], $supplied),
            'settings' => array_merge($gateway->settings ?? [], [
                'allowed_countries' => array_map('strtoupper', $data['allowed_countries'] ?? []),
                'capabilities' => $data['capabilities'] ?? [],
            ]),
        ])->save();

        $gateway->plans()->sync($data['plan_ids'] ?? []);

        $this->audit->log('platform.gateway_updated', $gateway, ['provider' => $gateway->provider, 'enabled' => $gateway->is_enabled], $request->user());

        return back()->with('success', 'Gateway configuration saved.');
    }

    public function toggle(Request $request, PaymentGateway $gateway): RedirectResponse
    {
        $gateway->forceFill(['is_enabled' => ! $gateway->is_enabled])->save();

        $this->audit->log('platform.gateway_toggled', $gateway, ['enabled' => $gateway->is_enabled], $request->user());

        return back()->with('success', $gateway->is_enabled ? 'Gateway enabled.' : 'Gateway disabled.');
    }

    public function setDefault(Request $request, PaymentGateway $gateway): RedirectResponse
    {
        PaymentGateway::query()->where('id', '!=', $gateway->getKey())->update(['is_default' => false]);
        $gateway->forceFill(['is_default' => true])->save();

        $this->audit->log('platform.gateway_default', $gateway, ['name' => $gateway->displayName()], $request->user());

        return back()->with('success', 'Default gateway updated.');
    }

    public function destroy(Request $request, PaymentGateway $gateway): RedirectResponse
    {
        $this->audit->log('platform.gateway_deleted', $gateway, ['provider' => $gateway->provider, 'name' => $gateway->name], $request->user());

        $gateway->delete();

        return back()->with('success', 'Gateway configuration deleted.');
    }

    public function test(Request $request, PaymentGateway $gateway): RedirectResponse
    {
        $missing = array_values(array_diff($this->registry->requiredCredentialKeys($gateway->provider), $gateway->credentialKeys()));

        if ($missing !== []) {
            $message = 'Missing credentials: '.implode(', ', $missing);
            $gateway->forceFill(['health_status' => 'error', 'last_error' => $message])->save();

            return back()->with('error', 'Configuration is incomplete: '.$message.'.');
        }

        $result = $this->gateways->driverFor($gateway)->testConnection($gateway);

        $gateway->forceFill([
            'health_status' => $result['ok'] ? 'ok' : 'error',
            'last_ok_at' => $result['ok'] ? now() : $gateway->last_ok_at,
            'last_error' => $result['ok'] ? null : $result['error'],
        ])->save();

        $this->audit->log('platform.gateway_tested', $gateway, ['provider' => $gateway->provider, 'ok' => $result['ok']], $request->user());

        return back()->with(
            $result['ok'] ? 'success' : 'error',
            $result['ok'] ? 'Gateway connection verified.' : 'Connection failed: '.($result['error'] ?? 'unknown error').'.',
        );
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request, bool $creating): array
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'provider' => ['required', Rule::in($this->registry->providers())],
            'environment' => ['required', Rule::in(['sandbox', 'production'])],
            'is_enabled' => ['boolean'],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'allowed_countries' => ['nullable', 'array'],
            'allowed_countries.*' => ['string', 'size:2'],
            'capabilities' => ['nullable', 'array'],
            'capabilities.*' => ['string', 'max:40'],
            'plan_ids' => ['nullable', 'array'],
            'plan_ids.*' => ['integer', 'exists:plans,id'],
            'credentials' => ['nullable', 'array'],
        ]);

        if ($creating) {
            $required = $this->registry->requiredCredentialKeys($data['provider']);
            $supplied = array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');

            $missing = array_values(array_diff($required, array_keys($supplied)));

            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'credentials' => $this->registry->label($data['provider']).' requires: '.implode(', ', str_replace('_', ' ', $missing)).'.',
                ]);
            }
        }

        return $data;
    }

    /** @return array<string, mixed> */
    protected function row(PaymentGateway $gateway): array
    {
        return [
            'id' => $gateway->getKey(),
            'name' => $gateway->displayName(),
            'provider' => $gateway->provider,
            'provider_label' => $this->registry->label($gateway->provider),
            'environment' => $gateway->environment->value,
            'is_enabled' => $gateway->is_enabled,
            'is_default' => $gateway->is_default,
            'supported_currencies' => $gateway->supported_currencies ?? [],
            'allowed_countries' => $gateway->allowedCountries(),
            'capabilities' => $gateway->capabilities(),
            'credential_keys' => $gateway->credentialKeys(),
            'recurring' => $this->registry->supportsRecurring($gateway->provider),
            'is_ready' => $gateway->isReady(),
            'health_status' => $gateway->health_status,
            'last_ok_at' => $gateway->last_ok_at?->toIso8601String(),
            'last_error' => $gateway->last_error,
            'plan_ids' => $gateway->plans()->pluck('plans.id')->map(fn ($id) => (string) $id)->all(),
            'webhook_url' => route('webhooks.platform-payments', ['provider' => $gateway->provider]),
        ];
    }
}
