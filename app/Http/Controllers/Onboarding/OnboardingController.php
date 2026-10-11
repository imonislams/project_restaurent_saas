<?php

namespace App\Http\Controllers\Onboarding;

use App\Domain\Branches\Enums\ServiceType;
use App\Domain\Onboarding\Enums\OnboardingStep;
use App\Domain\Onboarding\OnboardingService;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\BranchRequest;
use App\Http\Requests\Onboarding\CompanyRequest;
use App\Http\Requests\Onboarding\HoursRequest;
use App\Http\Requests\Onboarding\ReceiptRequest;
use App\Http\Requests\Onboarding\TaxRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(protected OnboardingService $onboarding) {}

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

        $this->onboarding->complete($tenant);

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
        $next = $step->next() ?? OnboardingStep::Review;

        return redirect()->route('onboarding.show', ['step' => $next->value])
            ->with('success', $step->label().' saved.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function stepData(Tenant $tenant, OnboardingStep $step): array
    {
        return match ($step) {
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
            OnboardingStep::Review => [],
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
        ];
    }
}
