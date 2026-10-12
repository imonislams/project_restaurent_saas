<?php

namespace App\Domain\Onboarding;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Branches\Enums\ServiceType;
use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Onboarding\Enums\OnboardingStep;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\DB;

/**
 * Drives the onboarding wizard: persists each step, tracks progress, derives
 * the current step from saved data (so progress is always resumable and
 * truthful) and builds the activation checklist shown on the dashboard.
 */
class OnboardingService
{
    /** Steps a user can configure during onboarding (Review is the finish line). */
    public const CONFIGURABLE_STEPS = [
        OnboardingStep::Company,
        OnboardingStep::Branch,
        OnboardingStep::Hours,
        OnboardingStep::Tax,
        OnboardingStep::Receipt,
    ];

    /** Steps that must be complete before the restaurant can be activated. */
    public const REQUIRED_STEPS = [
        OnboardingStep::Company,
        OnboardingStep::Branch,
    ];

    public function currentStep(Tenant $tenant): OnboardingStep
    {
        return $this->firstIncompleteStep($tenant) ?? OnboardingStep::Review;
    }

    public function firstIncompleteStep(Tenant $tenant): ?OnboardingStep
    {
        foreach (self::CONFIGURABLE_STEPS as $step) {
            if (! $this->isStepComplete($tenant, $step)) {
                return $step;
            }
        }

        return null;
    }

    /**
     * The first required step still incomplete, or null when activation is allowed.
     */
    public function firstIncompleteRequiredStep(Tenant $tenant): ?OnboardingStep
    {
        foreach (self::REQUIRED_STEPS as $step) {
            if (! $this->isStepComplete($tenant, $step)) {
                return $step;
            }
        }

        return null;
    }

    public function isStepComplete(Tenant $tenant, OnboardingStep $step): bool
    {
        return match ($step) {
            OnboardingStep::Company => $this->companyConfigured($tenant),
            OnboardingStep::Branch => $this->branchConfigured($tenant),
            OnboardingStep::Hours => $this->hoursConfigured($tenant),
            OnboardingStep::Tax => $this->taxConfigured($tenant),
            OnboardingStep::Receipt => $this->receiptConfigured($tenant),
            OnboardingStep::Review => $tenant->hasCompletedOnboarding(),
        };
    }

    /**
     * @return array{percent: int, completed: int, total: int, steps: list<array>}
     */
    public function progress(Tenant $tenant): array
    {
        $total = count(self::CONFIGURABLE_STEPS);
        $completed = 0;

        $steps = [];
        foreach (OnboardingStep::ordered() as $step) {
            $isComplete = $this->isStepComplete($tenant, $step);

            if ($step !== OnboardingStep::Review && $isComplete) {
                $completed++;
            }

            $steps[] = [
                'value' => $step->value,
                'label' => $step->label(),
                'description' => $step->description(),
                'required' => $step->isRequired(),
                'optional' => $step->isOptional(),
                'complete' => $isComplete,
            ];
        }

        return [
            'percent' => $total > 0 ? (int) round($completed / $total * 100) : 0,
            'completed' => $completed,
            'total' => $total,
            'steps' => $steps,
        ];
    }

    public function saveCompany(Tenant $tenant, array $data): void
    {
        $tenant->mergeSettings([
            'company' => [
                'legal_name' => $data['legal_name'],
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'tax_id' => $data['tax_id'] ?? null,
                'address' => $data['address'] ?? null,
            ],
            'region' => [
                'country' => $data['country'],
                'currency' => $data['currency'],
                'timezone' => $data['timezone'],
            ],
        ]);

        $tenant->save();
    }

    public function saveBranch(Tenant $tenant, array $data): Branch
    {
        return DB::transaction(function () use ($tenant, $data) {
            $branch = $this->branchForOnboarding($tenant)
                ?? new Branch(['tenant_id' => $tenant->getKey(), 'is_primary' => true]);

            $isFirst = ! $branch->exists;

            $branch->fill([
                'tenant_id' => $tenant->getKey(),
                'name' => $data['name'],
                'code' => $data['code'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'timezone' => $data['timezone'] ?? null,
                'currency' => $data['currency'] ?? null,
                'service_types' => $data['service_types'] ?? [],
                'is_active' => true,
            ]);

            if ($isFirst) {
                $branch->is_primary = true;
            }

            $branch->save();

            if ($branch->stockLocations()->doesntExist()) {
                app(ProvisionInventoryDefaults::class)
                    ->defaultLocationFor($branch);
            }

            app(ProvisionAccountingDefaults::class)
                ->cashAccountFor($branch);

            return $branch;
        });
    }

    /**
     * @param  array<int, array{day_of_week: int, is_closed: bool, opens_at: ?string, closes_at: ?string}>  $days
     */
    public function saveHours(Tenant $tenant, array $days): void
    {
        $branch = $this->branchForOnboarding($tenant);

        if (! $branch) {
            return;
        }

        DB::transaction(function () use ($branch, $days) {
            $branch->businessHours()->delete();

            foreach ($days as $day) {
                $closed = (bool) ($day['is_closed'] ?? false);

                $branch->businessHours()->create([
                    'tenant_id' => $branch->tenant_id,
                    'day_of_week' => (int) $day['day_of_week'],
                    'is_closed' => $closed,
                    'opens_at' => $closed ? null : ($day['opens_at'] ?? null),
                    'closes_at' => $closed ? null : ($day['closes_at'] ?? null),
                ]);
            }
        });
    }

    public function saveTax(Tenant $tenant, array $data): void
    {
        $tenant->mergeSettings([
            'tax' => [
                'name' => $data['tax_name'],
                'rate' => (float) $data['tax_rate'],
                'inclusive' => (bool) ($data['tax_inclusive'] ?? false),
            ],
        ]);

        $tenant->save();
    }

    public function saveReceipt(Tenant $tenant, array $data): void
    {
        $tenant->mergeSettings([
            'receipt' => [
                'header' => $data['receipt_header'] ?? null,
                'footer' => $data['receipt_footer'] ?? null,
                'show_tax' => (bool) ($data['receipt_show_tax'] ?? true),
                'show_logo' => (bool) ($data['receipt_show_logo'] ?? false),
            ],
        ]);

        $tenant->save();
    }

    public function complete(Tenant $tenant): void
    {
        $tenant->forceFill([
            'onboarding_completed_at' => now(),
            'onboarding_step' => null,
        ])->save();
    }

    /**
     * Activation checklist rendered on the dashboard.
     *
     * @return list<array{key: string, label: string, done: bool, required: bool}>
     */
    public function checklist(Tenant $tenant): array
    {
        return [
            $this->checklistItem('company', 'Company & region configured', $this->companyConfigured($tenant), true, 'settings.show', ['group' => 'company']),
            $this->checklistItem('branch', 'First branch created', $this->branchConfigured($tenant), true, 'settings.show', ['group' => 'branches']),
            $this->checklistItem('hours', 'Operating hours set', $this->hoursConfigured($tenant), false, 'settings.show', ['group' => 'hours']),
            $this->checklistItem('tax', 'Tax preferences set', $this->taxConfigured($tenant), false, 'settings.show', ['group' => 'tax']),
            $this->checklistItem('receipt', 'Receipt details set', $this->receiptConfigured($tenant), false, 'settings.show', ['group' => 'receipt']),
            $this->checklistItem('payments', 'Payment settings reviewed', $this->paymentsConfigured($tenant), false, 'settings.show', ['group' => 'pos']),
            $this->checklistItem('staff', 'Team invited', $this->staffConfigured($tenant), false, 'staff.index', []),
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array{key: string, label: string, done: bool, required: bool, action: ?array{label: string, href: string}}
     */
    protected function checklistItem(string $key, string $label, bool $done, bool $required, string $routeName, array $params): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'done' => $done,
            'required' => $required,
            'action' => $done ? null : [
                'label' => $required ? 'Set up' : 'Configure',
                'href' => route($routeName, $params),
            ],
        ];
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    public function incompleteWarnings(Tenant $tenant): array
    {
        return collect($this->checklist($tenant))
            ->where('done', false)
            ->where('required', true)
            ->map(fn (array $item) => ['key' => $item['key'], 'label' => $item['label']])
            ->values()
            ->all();
    }

    public function branchForOnboarding(Tenant $tenant): ?Branch
    {
        return $tenant->branches()->orderByDesc('is_primary')->first();
    }

    protected function paymentsConfigured(Tenant $tenant): bool
    {
        return $tenant->getSetting('payments.provider') !== null;
    }

    protected function staffConfigured(Tenant $tenant): bool
    {
        return $tenant->users()->count() > 1 || $tenant->invitations()->exists();
    }

    public function savePos(Tenant $tenant, array $data): void
    {
        $tenant->mergeSettings([
            'service_charge.rate' => (float) ($data['service_charge_rate'] ?? 0),
            'pos.allow_partial' => (bool) ($data['pos_allow_partial'] ?? false),
            'pos.cash_variance_threshold' => isset($data['pos_cash_variance_threshold']) && $data['pos_cash_variance_threshold'] !== ''
                ? (float) $data['pos_cash_variance_threshold'] : null,
            'pos.discount_approval_percent' => isset($data['pos_discount_approval_percent']) && $data['pos_discount_approval_percent'] !== ''
                ? (float) $data['pos_discount_approval_percent'] : null,
            'payments.provider' => $data['payments_provider'] ?? 'manual',
        ]);

        $tenant->save();
    }

    public function saveNotifications(Tenant $tenant, array $data): void
    {
        $tenant->mergeSettings([
            'inventory.low_stock_threshold' => isset($data['low_stock_threshold']) && $data['low_stock_threshold'] !== ''
                ? (float) $data['low_stock_threshold'] : 0,
            'loyalty.enabled' => (bool) ($data['loyalty_enabled'] ?? false),
            'loyalty.points_per_currency' => (float) ($data['loyalty_points_per_currency'] ?? 1),
        ]);

        $tenant->save();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function saveQr(Tenant $tenant, array $data): void
    {
        $tenant->mergeSettings([
            'qr.enabled' => (bool) ($data['qr_enabled'] ?? true),
            'qr.guest_checkout' => (bool) ($data['qr_guest_checkout'] ?? true),
            'qr.require_phone' => (bool) ($data['qr_require_phone'] ?? false),
            'qr.require_email' => (bool) ($data['qr_require_email'] ?? false),
            'qr.session_timeout_minutes' => (int) ($data['qr_session_timeout_minutes'] ?? 180),
            'qr.auto_accept' => (bool) ($data['qr_auto_accept'] ?? true),
            'qr.allow_additional_orders' => (bool) ($data['qr_allow_additional_orders'] ?? true),
            'qr.allow_notes' => (bool) ($data['qr_allow_notes'] ?? true),
            'qr.live_tracking' => (bool) ($data['qr_live_tracking'] ?? true),
            'qr.allow_bill_request' => (bool) ($data['qr_allow_bill_request'] ?? true),
            'qr.billing_mode' => $data['qr_billing_mode'] ?? 'consolidated',
            'qr.digital_receipt' => (bool) ($data['qr_digital_receipt'] ?? true),
            'qr.feedback' => (bool) ($data['qr_feedback'] ?? true),
            'qr.loyalty' => (bool) ($data['qr_loyalty'] ?? false),
        ]);

        $tenant->save();
    }

    /**
     * Form payload for a Settings tab.
     *
     * @return array<string, mixed>
     */
    public function settingsFormData(Tenant $tenant, string $group): array
    {
        return match ($group) {
            'pos' => [
                'service_charge_rate' => (float) $tenant->getSetting('service_charge.rate', 0),
                'pos_allow_partial' => (bool) $tenant->getSetting('pos.allow_partial', false),
                'pos_cash_variance_threshold' => $tenant->getSetting('pos.cash_variance_threshold'),
                'pos_discount_approval_percent' => $tenant->getSetting('pos.discount_approval_percent'),
                'payments_provider' => $tenant->getSetting('payments.provider', 'manual'),
            ],
            'notifications' => [
                'low_stock_threshold' => (float) $tenant->getSetting('inventory.low_stock_threshold', 0),
                'loyalty_enabled' => (bool) $tenant->getSetting('loyalty.enabled', false),
                'loyalty_points_per_currency' => (float) $tenant->getSetting('loyalty.points_per_currency', 1),
            ],
            'qr' => [
                'qr_enabled' => (bool) $tenant->getSetting('qr.enabled', true),
                'qr_guest_checkout' => (bool) $tenant->getSetting('qr.guest_checkout', true),
                'qr_require_phone' => (bool) $tenant->getSetting('qr.require_phone', false),
                'qr_require_email' => (bool) $tenant->getSetting('qr.require_email', false),
                'qr_session_timeout_minutes' => (int) $tenant->getSetting('qr.session_timeout_minutes', 180),
                'qr_auto_accept' => (bool) $tenant->getSetting('qr.auto_accept', true),
                'qr_allow_additional_orders' => (bool) $tenant->getSetting('qr.allow_additional_orders', true),
                'qr_allow_notes' => (bool) $tenant->getSetting('qr.allow_notes', true),
                'qr_live_tracking' => (bool) $tenant->getSetting('qr.live_tracking', true),
                'qr_allow_bill_request' => (bool) $tenant->getSetting('qr.allow_bill_request', true),
                'qr_billing_mode' => (string) $tenant->getSetting('qr.billing_mode', 'consolidated'),
                'qr_digital_receipt' => (bool) $tenant->getSetting('qr.digital_receipt', true),
                'qr_feedback' => (bool) $tenant->getSetting('qr.feedback', true),
                'qr_loyalty' => (bool) $tenant->getSetting('qr.loyalty', false),
            ],
            default => $this->stepData($tenant, OnboardingStep::from($group === 'branches' ? 'branch' : $group)),
        };
    }

    /**
     * Shared select options for onboarding and settings.
     *
     * @return array<string, mixed>
     */
    public function options(): array
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

    /**
     * @return array<string, mixed>
     */
    public function stepData(Tenant $tenant, OnboardingStep $step): array
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
    public function branchData(Tenant $tenant): array
    {
        $branch = $this->branchForOnboarding($tenant);

        return [
            'name' => $branch?->name ?? $tenant->name,
            'code' => $branch?->code ?? '',
            'address' => $branch?->address ?? $tenant->getSetting('company.address', ''),
            'phone' => $branch?->phone ?? $tenant->getSetting('company.phone', ''),
            'timezone' => $branch?->timezone ?? $tenant->getSetting('region.timezone'),
            'currency' => $branch?->currency ?? $tenant->getSetting('region.currency'),
            'service_types' => $branch?->serviceTypes() ?? [ServiceType::DineIn->value],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function hoursData(Tenant $tenant): array
    {
        $branch = $this->branchForOnboarding($tenant);
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

    protected function companyConfigured(Tenant $tenant): bool
    {
        return $tenant->getSetting('region.currency') !== null
            && $tenant->getSetting('region.timezone') !== null
            && $tenant->getSetting('company.legal_name') !== null;
    }

    protected function branchConfigured(Tenant $tenant): bool
    {
        return $tenant->branches()->exists();
    }

    protected function hoursConfigured(Tenant $tenant): bool
    {
        $branch = $this->branchForOnboarding($tenant);

        return $branch !== null && $branch->businessHours()->exists();
    }

    protected function taxConfigured(Tenant $tenant): bool
    {
        return $tenant->getSetting('tax.rate') !== null;
    }

    protected function receiptConfigured(Tenant $tenant): bool
    {
        return $tenant->getSetting('receipt') !== null;
    }
}
