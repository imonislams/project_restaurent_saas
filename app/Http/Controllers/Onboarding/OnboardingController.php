<?php

namespace App\Http\Controllers\Onboarding;

use App\Domain\Branches\Enums\ServiceType;
use App\Domain\Demo\DemoDataService;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Role;
use App\Domain\Onboarding\Enums\OnboardingStep;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\PaymentGateways\TenantGatewayManager;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\BranchRequest;
use App\Http\Requests\Onboarding\CompanyRequest;
use App\Http\Requests\Onboarding\HoursRequest;
use App\Http\Requests\Onboarding\ReceiptRequest;
use App\Http\Requests\Onboarding\TaxRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(
        protected OnboardingService $onboarding,
        protected TenantGatewayManager $gateways,
    ) {}

    public function index(Request $request): RedirectResponse
    {
        return redirect()->route('onboarding.show', [
            'step' => $this->onboarding->currentStep($this->tenant($request))->value,
        ]);
    }

    public function show(Request $request, string $step): Response|RedirectResponse
    {
        $tenant = $this->tenant($request);
        $current = OnboardingStep::tryFrom($step);

        if (! $current) {
            return redirect()->route('onboarding.show', [
                'step' => $this->onboarding->currentStep($tenant)->value,
            ]);
        }

        return Inertia::render('Onboarding/Show', [
            'step' => $current->value,
            'progress' => $this->onboarding->progress($tenant),
            'form' => $this->stepData($tenant, $current),
            'options' => $this->options(),
        ]);
    }

    public function storeProfile(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'role_title' => ['nullable', 'string', 'max:120'],
        ]);

        $this->onboarding->saveProfile($this->tenant($request), $data, $request->user());

        return $this->redirectToNext(OnboardingStep::Profile);
    }

    public function storeCompany(CompanyRequest $request): RedirectResponse
    {
        $this->onboarding->saveCompany($this->tenant($request), $request->validated());

        return $this->redirectToNext(OnboardingStep::Company);
    }

    public function storeBranch(BranchRequest $request): RedirectResponse
    {
        $this->onboarding->saveBranch($this->tenant($request), $request->validated());

        return $this->redirectToNext(OnboardingStep::Branch);
    }

    public function storeHours(HoursRequest $request): RedirectResponse
    {
        $this->onboarding->saveHours($this->tenant($request), $request->validated()['days']);

        return $this->redirectToNext(OnboardingStep::Hours);
    }

    public function storeTax(TaxRequest $request): RedirectResponse
    {
        $this->onboarding->saveTax($this->tenant($request), $request->validated());

        return $this->redirectToNext(OnboardingStep::Tax);
    }

    public function storeReceipt(ReceiptRequest $request): RedirectResponse
    {
        $this->onboarding->saveReceipt($this->tenant($request), $request->validated());

        return $this->redirectToNext(OnboardingStep::Receipt);
    }

    public function storePayments(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'gateways' => ['nullable', 'array'],
            'gateways.*.provider' => ['required', Rule::in($this->gateways->providers())],
            'gateways.*.environment' => ['nullable', Rule::in(['sandbox', 'production'])],
            'gateways.*.is_enabled' => ['boolean'],
            'gateways.*.supported_currencies' => ['nullable', 'array'],
            'gateways.*.supported_currencies.*' => ['string', 'size:3'],
            'gateways.*.credentials' => ['nullable', 'array'],
            'default_provider' => ['nullable', 'string', Rule::in($this->gateways->providers())],
        ]);

        $this->assertCredentialsPresent($data['gateways'] ?? []);

        $this->onboarding->savePayments($this->tenant($request), $data);

        return $this->redirectToNext(OnboardingStep::Payments);
    }

    /**
     * Every enabled non-cash gateway must arrive with the credentials its driver
     * needs — an enabled gateway with missing keys could never take a payment.
     *
     * @param  list<array<string, mixed>>  $gateways
     */
    protected function assertCredentialsPresent(array $gateways): void
    {
        foreach ($gateways as $gateway) {
            $provider = $gateway['provider'] ?? null;

            if (! $provider || $provider === 'cash' || ! ($gateway['is_enabled'] ?? true)) {
                continue;
            }

            $supplied = array_filter($gateway['credentials'] ?? [], fn ($value) => $value !== null && $value !== '');
            $missing = array_diff($this->gateways->requiredCredentialKeys($provider), array_keys($supplied));

            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'gateways' => ucfirst($provider).' is missing required credentials: '.implode(', ', $missing).'.',
                ]);
            }
        }
    }

    public function storeMenu(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category_name' => ['nullable', 'string', 'max:120'],
            'product_name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $this->onboarding->saveMenu($this->tenant($request), $data);

        return $this->redirectToNext(OnboardingStep::Menu);
    }

    public function storeTeam(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:60'],
        ]);

        $this->onboarding->saveTeam($this->tenant($request), $data, $request->user());

        return $this->redirectToNext(OnboardingStep::Team);
    }

    public function skip(Request $request, string $step): RedirectResponse
    {
        $current = OnboardingStep::tryFrom($step);

        if (! $current || ! $current->isOptional()) {
            return back()->with('error', 'This step is required and cannot be skipped.');
        }

        return $this->redirectToNext($current);
    }

    public function complete(Request $request): RedirectResponse
    {
        $tenant = $this->tenant($request);

        if ($missing = $this->onboarding->firstIncompleteRequiredStep($tenant)) {
            return redirect()->route('onboarding.show', ['step' => $missing->value])
                ->with('error', 'Please complete the required steps before activating.');
        }

        $request->validate(['demo_enabled' => ['nullable', 'boolean']]);

        $this->onboarding->complete($tenant);

        // Sample data is on by default: a workspace with something in it teaches
        // the product far better than empty screens, and the owner can remove it
        // from Settings → Demo data at any time.
        if ($request->boolean('demo_enabled', true)) {
            try {
                app(DemoDataService::class)->start($tenant, $request->user());

                return redirect()->route('demo.setup')
                    ->with('success', 'Setup complete. Now building your demo restaurant.');
            } catch (\Throwable $e) {
                report($e);

                return redirect()->route('dashboard')
                    ->with('error', 'Setup complete, but the demo data could not be started: '.$e->getMessage());
            }
        }

        return redirect()->route('dashboard')
            ->with('success', 'Setup complete. Your restaurant is ready.');
    }

    protected function tenant(Request $request): Tenant
    {
        $tenant = $request->user()?->tenant;

        abort_if($tenant === null, 403);

        return $tenant;
    }

    protected function redirectToNext(OnboardingStep $step): RedirectResponse
    {
        $next = $this->onboarding->advanceStep($this->tenant(request()), $step);

        return redirect()->route('onboarding.show', ['step' => $next->value])
            ->with('success', $step->label().' saved.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function stepData(Tenant $tenant, OnboardingStep $step): array
    {
        $owner = $tenant->users()->orderBy('id')->first();

        return match ($step) {
            OnboardingStep::Profile => [
                'name' => $owner?->name ?? ($tenant->users()->orderBy('id')->value('name') ?? ''),
                'phone' => $owner?->phone ?? '',
                'role_title' => $tenant->getSetting('profile.role_title', ''),
                // Mobile accounts already hold a verified number; only email accounts may add one.
                'phone_editable' => $owner?->registersByEmail() ?? true,
            ],
            OnboardingStep::Company => [
                'legal_name' => $tenant->getSetting('company.legal_name', $tenant->name),
                'phone' => $tenant->getSetting('company.phone', ''),
                'email' => $tenant->getSetting('company.email', $tenant->business_email),
                'tax_id' => $tenant->getSetting('company.tax_id', ''),
                'address' => $tenant->getSetting('company.address', ''),
                'country' => $tenant->getSetting('region.country', 'BD'),
                'currency' => $tenant->getSetting('region.currency', 'BDT'),
                'timezone' => $tenant->getSetting('region.timezone', config('app.timezone')),
            ],
            OnboardingStep::Branch => $this->branchData($tenant),
            OnboardingStep::Hours => ['days' => $this->hoursData($tenant)],
            OnboardingStep::Tax => [
                'tax_name' => $tenant->getSetting('tax.name', 'VAT'),
                'tax_rate' => $tenant->getSetting('tax.rate', 0),
                'tax_inclusive' => (bool) $tenant->getSetting('tax.inclusive', false),
            ],
            OnboardingStep::Receipt => [
                'receipt_header' => $tenant->getSetting('receipt.header', $tenant->name),
                'receipt_footer' => $tenant->getSetting('receipt.footer', 'Thank you for dining with us!'),
                'receipt_show_tax' => (bool) $tenant->getSetting('receipt.show_tax', true),
                'receipt_show_logo' => (bool) $tenant->getSetting('receipt.show_logo', false),
            ],
            OnboardingStep::Payments => [
                'gateways' => $this->gateways->forTenant($tenant)->map(fn ($gateway) => [
                    'provider' => $gateway->provider,
                    'environment' => $gateway->environment,
                    'is_enabled' => $gateway->is_enabled,
                    'supported_currencies' => $gateway->supported_currencies ?? [],
                    // Names of the keys already stored — never their values.
                    'credential_keys' => $gateway->credentialKeys(),
                ])->values(),
                'default_provider' => $tenant->getSetting('payments.provider'),
                'accept_cash' => (bool) $tenant->getSetting('payments.accept_cash', true),
            ],
            OnboardingStep::Menu => [
                'category_name' => '',
                'product_name' => '',
                'price' => 0,
                'cost_price' => 0,
            ],
            OnboardingStep::Team => [
                'email' => '',
                'name' => '',
                'role' => 'branch_manager',
            ],
            OnboardingStep::Review => [
                'demo' => [
                    'days' => DemoDataService::DEFAULT_DAYS,
                    'min_days' => DemoDataService::MIN_DAYS,
                ],
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    protected function branchData(Tenant $tenant): array
    {
        $branch = $this->onboarding->branchForOnboarding($tenant);
        $region = [
            'timezone' => $tenant->getSetting('region.timezone'),
            'currency' => $tenant->getSetting('region.currency'),
        ];

        return [
            'name' => $branch?->name ?? $tenant->name,
            'code' => $branch?->code ?? '',
            'address' => $branch?->address ?? $tenant->getSetting('company.address', ''),
            'phone' => $branch?->phone ?? $tenant->getSetting('company.phone', ''),
            'timezone' => $branch?->timezone ?? $region['timezone'],
            'currency' => $branch?->currency ?? $region['currency'],
            'service_types' => $branch?->serviceTypes() ?? [ServiceType::DineIn->value],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function hoursData(Tenant $tenant): array
    {
        $branch = $this->onboarding->branchForOnboarding($tenant);
        $existing = $branch?->businessHours()->get()->keyBy('day_of_week');

        $days = [];
        for ($day = 0; $day <= 6; $day++) {
            $row = $existing?->get($day);

            $days[] = [
                'day_of_week' => $day,
                'is_closed' => $row?->is_closed ?? false,
                'opens_at' => $row?->opens_at ? substr($row->opens_at, 0, 5) : '09:00',
                'closes_at' => $row?->closes_at ? substr($row->closes_at, 0, 5) : '22:00',
            ];
        }

        return $days;
    }

    /**
     * @return array<string, mixed>
     */
    protected function options(): array
    {
        return [
            'countries' => collect(config('geo.countries'))
                ->map(fn ($name, $code) => ['value' => $code, 'label' => $name])
                ->values(),
            'currencies' => collect(config('geo.currencies'))
                ->map(fn ($meta, $code) => ['value' => $code, 'label' => $code.' — '.$meta['name'], 'symbol' => $meta['symbol']])
                ->values(),
            'timezones' => collect(config('geo.timezones'))
                ->map(fn ($tz) => ['value' => $tz, 'label' => $tz])
                ->values(),
            'service_types' => collect(ServiceType::cases())
                ->map(fn (ServiceType $type) => ['value' => $type->value, 'label' => $type->label()])
                ->values(),
            'gateway_schema' => $this->gateways->schema(),
            'gateway_providers' => $this->gateways->providers(),
            'roles' => Role::whereNull('tenant_id')
                ->whereNotIn('slug', RoleName::platformValues())
                ->orderBy('name')
                ->get()
                ->map(fn ($role) => ['value' => $role->slug, 'label' => $role->name])
                ->values(),
        ];
    }
}
