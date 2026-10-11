<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GatewayController extends Controller
{
    protected const REQUIRED_CREDENTIALS = [
        'sslcommerz' => ['store_id', 'store_password'],
        'manual' => [],
    ];

    public function __construct(
        protected PlatformGatewayManager $gateways,
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
        return Inertia::render('Platform/Gateways/Index', [
            'gateways' => $this->gateways->all()
                ->when($providerFilter, fn ($configs) => $configs->where('provider', $providerFilter)->values())
                ->map(fn (PaymentGateway $gateway) => [
                    'id' => $gateway->getKey(),
                    'name' => $gateway->displayName(),
                    'provider' => $gateway->provider,
                    'environment' => $gateway->environment->value,
                    'is_enabled' => $gateway->is_enabled,
                    'is_default' => $gateway->is_default,
                    'supported_currencies' => $gateway->supported_currencies ?? [],
                    'credential_keys' => $gateway->credentialKeys(),
                    'health_status' => $gateway->health_status,
                    'last_ok_at' => $gateway->last_ok_at?->toIso8601String(),
                    'last_error' => $gateway->last_error,
                ])->values(),
            'provider_filter' => $providerFilter,
            'providers' => $this->gateways->providers(),
            'required_credentials' => self::REQUIRED_CREDENTIALS,
            'currencies' => collect(config('platform.currencies'))->map(fn ($label, $code) => ['value' => $code, 'label' => $code.' — '.$label])->values()->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $gateway = PaymentGateway::create([
            'name' => $data['name'] ?? null,
            'provider' => $data['provider'],
            'environment' => $data['environment'],
            'is_enabled' => $data['is_enabled'] ?? false,
            'supported_currencies' => array_map('strtoupper', $data['supported_currencies'] ?? []),
            'credentials' => array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== ''),
        ]);

        $this->audit->log('platform.gateway_created', $gateway, ['provider' => $gateway->provider, 'name' => $gateway->name], $request->user());

        return back()->with('success', 'Gateway configuration created.');
    }

    public function update(Request $request, PaymentGateway $gateway): RedirectResponse
    {
        $data = $this->validated($request);

        // Only overwrite credential keys the operator actually supplied.
        $supplied = array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');

        $gateway->forceFill([
            'name' => $data['name'] ?? $gateway->name,
            'provider' => $data['provider'],
            'environment' => $data['environment'],
            'is_enabled' => $data['is_enabled'] ?? false,
            'supported_currencies' => array_map('strtoupper', $data['supported_currencies'] ?? []),
            'credentials' => array_merge($gateway->credentials ?? [], $supplied),
        ])->save();

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
        $required = self::REQUIRED_CREDENTIALS[$gateway->provider] ?? [];
        $missing = array_values(array_diff($required, $gateway->credentialKeys()));

        if ($missing !== []) {
            $gateway->forceFill(['health_status' => 'error', 'last_error' => 'Missing credentials: '.implode(', ', $missing)])->save();

            return back()->with('error', 'Configuration is incomplete: missing '.implode(', ', $missing).'.');
        }

        $gateway->forceFill(['health_status' => 'ok', 'last_ok_at' => now(), 'last_error' => null])->save();

        $this->audit->log('platform.gateway_tested', $gateway, ['provider' => $gateway->provider], $request->user());

        return back()->with('success', 'Gateway configuration looks complete.');
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:100'],
            'provider' => ['required', Rule::in($this->gateways->providers())],
            'environment' => ['required', Rule::in(['sandbox', 'production'])],
            'is_enabled' => ['boolean'],
            'supported_currencies' => ['nullable', 'array'],
            'supported_currencies.*' => ['string', 'size:3'],
            'credentials' => ['nullable', 'array'],
        ]);

        if ($data['provider'] === 'sslcommerz') {
            $store = $data['credentials']['store_id'] ?? null;
            $secret = $data['credentials']['store_password'] ?? null;

            // Only enforce on create; edits may leave masked fields blank.
            if ($request->isMethod('post') && (empty($store) || empty($secret))) {
                throw ValidationException::withMessages(['credentials' => 'SSLCommerz requires a store ID and store password.']);
            }
        }

        return $data;
    }
}
