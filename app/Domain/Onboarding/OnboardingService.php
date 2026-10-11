<?php

namespace App\Domain\Onboarding;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
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
            [
                'key' => 'company',
                'label' => 'Company & region configured',
                'done' => $this->companyConfigured($tenant),
                'required' => true,
            ],
            [
                'key' => 'branch',
                'label' => 'First branch created',
                'done' => $this->branchConfigured($tenant),
                'required' => true,
            ],
            [
                'key' => 'hours',
                'label' => 'Operating hours set',
                'done' => $this->hoursConfigured($tenant),
                'required' => false,
            ],
            [
                'key' => 'tax',
                'label' => 'Tax preferences set',
                'done' => $this->taxConfigured($tenant),
                'required' => false,
            ],
            [
                'key' => 'receipt',
                'label' => 'Receipt details set',
                'done' => $this->receiptConfigured($tenant),
                'required' => false,
            ],
            [
                'key' => 'payments',
                'label' => 'Payment methods configured',
                'done' => false,
                'required' => false,
            ],
            [
                'key' => 'staff',
                'label' => 'Team invited',
                'done' => false,
                'required' => false,
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
