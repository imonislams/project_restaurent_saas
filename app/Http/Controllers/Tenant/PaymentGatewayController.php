<?php

namespace App\Http\Controllers\Tenant;

use App\Domain\Auditing\AuditLogger;
use App\Domain\PaymentGateways\Models\TenantGateway;
use App\Domain\PaymentGateways\TenantGatewayManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The restaurant owner's payment gateway settings. Several gateways may be
 * enabled at once (e.g. cash + SSLCommerz + bKash); one is the default.
 * Credentials are encrypted at rest and never returned to the frontend.
 */
class PaymentGatewayController extends Controller
{
    public function __construct(
        protected TenantGatewayManager $gateways,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $tenant = $this->tenant($request);

        return Inertia::render('Settings/Payments', [
            'gateways' => $this->gateways->forTenant($tenant)->map(fn (TenantGateway $gateway) => [
                'id' => $gateway->getKey(),
                'name' => $gateway->displayName(),
                'provider' => $gateway->provider,
                'environment' => $gateway->environment,
                'is_enabled' => $gateway->is_enabled,
                'is_default' => $gateway->is_default,
                'supported_currencies' => $gateway->supported_currencies ?? [],
                'credential_keys' => $gateway->credentialKeys(),
                'health_status' => $gateway->health_status,
                'last_ok_at' => $gateway->last_ok_at?->toIso8601String(),
                'last_error' => $gateway->last_error,
            ])->values(),
            'providers' => $this->gateways->providers(),
            'schema' => $this->gateways->schema(),
            'required_credentials' => collect($this->gateways->providers())
                ->mapWithKeys(fn (string $provider) => [$provider => $this->gateways->requiredCredentialKeys($provider)])
                ->all(),
            'currencies' => collect(config('geo.currencies'))->map(fn ($meta, $code) => ['value' => $code, 'label' => $code])->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $tenant = $this->tenant($request);
        $data = $this->validated($request, creating: true);

        $gateway = $tenant->paymentGateways()->create([
            'name' => $data['name'] ?? null,
            'provider' => $data['provider'],
            'environment' => $data['environment'],
            'is_enabled' => $data['is_enabled'] ?? true,
            'is_default' => $tenant->paymentGateways()->doesntExist(),
            'supported_currencies' => $data['supported_currencies'] ?? [],
            'credentials' => array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== ''),
        ]);

        $this->audit->log('settings.payment_gateway_created', $gateway, ['provider' => $gateway->provider], $request->user(), $tenant->getKey());

        return back()->with('success', 'Payment gateway added.');
    }

    public function update(Request $request, TenantGateway $gateway): RedirectResponse
    {
        $this->authorizeTenant($request, $gateway);
        $data = $this->validated($request, creating: false);

        $supplied = array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');

        $gateway->forceFill([
            'name' => $data['name'] ?? $gateway->name,
            'environment' => $data['environment'],
            'is_enabled' => $data['is_enabled'] ?? false,
            'supported_currencies' => $data['supported_currencies'] ?? [],
            'credentials' => array_merge($gateway->credentials ?? [], $supplied),
        ])->save();

        $this->audit->log('settings.payment_gateway_updated', $gateway, ['provider' => $gateway->provider], $request->user(), $gateway->tenant_id);

        return back()->with('success', 'Payment gateway saved.');
    }

    public function toggle(Request $request, TenantGateway $gateway): RedirectResponse
    {
        $this->authorizeTenant($request, $gateway);

        $gateway->forceFill(['is_enabled' => ! $gateway->is_enabled])->save();

        return back()->with('success', $gateway->is_enabled ? 'Gateway enabled.' : 'Gateway disabled.');
    }

    public function setDefault(Request $request, TenantGateway $gateway): RedirectResponse
    {
        $this->authorizeTenant($request, $gateway);

        $gateway->tenant->paymentGateways()->whereKeyNot($gateway->getKey())->update(['is_default' => false]);
        $gateway->forceFill(['is_default' => true, 'is_enabled' => true])->save();

        return back()->with('success', 'Default gateway updated.');
    }

    public function destroy(Request $request, TenantGateway $gateway): RedirectResponse
    {
        $this->authorizeTenant($request, $gateway);

        $this->audit->log('settings.payment_gateway_deleted', $gateway, ['provider' => $gateway->provider], $request->user(), $gateway->tenant_id);

        $gateway->delete();

        return back()->with('success', 'Payment gateway removed.');
    }

    public function test(Request $request, TenantGateway $gateway): RedirectResponse
    {
        $this->authorizeTenant($request, $gateway);

        $required = $this->gateways->requiredCredentialKeys($gateway->provider);
        $missing = array_values(array_diff($required, $gateway->credentialKeys()));

        if ($missing !== []) {
            $gateway->forceFill(['health_status' => 'error', 'last_error' => 'Missing credentials: '.implode(', ', $missing)])->save();

            return back()->with('error', 'Configuration is incomplete: missing '.implode(', ', $missing).'.');
        }

        $gateway->forceFill(['health_status' => 'ok', 'last_ok_at' => now(), 'last_error' => null])->save();

        return back()->with('success', 'Gateway configuration looks complete.');
    }

    /** @return array<string, mixed> */
    protected function validated(Request $request, bool $creating): array
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

        if ($creating && $data['provider'] !== 'cash') {
            $supplied = array_filter($data['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');
            $missing = array_diff($this->gateways->requiredCredentialKeys($data['provider']), array_keys($supplied));

            if ($missing !== []) {
                throw ValidationException::withMessages(['credentials' => 'Missing required credentials: '.implode(', ', $missing).'.']);
            }
        }

        return $data;
    }

    protected function authorizeTenant(Request $request, TenantGateway $gateway): void
    {
        abort_unless($gateway->tenant_id === $request->user()->tenant_id, 404);
    }

    protected function tenant(Request $request): \App\Domain\Tenancy\Models\Tenant
    {
        $tenant = $request->user()?->tenant;

        abort_if($tenant === null, 403);

        return $tenant;
    }
}
