<?php

namespace App\Domain\Demo\Data;

use App\Domain\Tenancy\Models\Tenant;

/**
 * Everything region-specific for one tenant's demo: which curated menu to use,
 * how people are named, how money is scaled, and the fixture lists that make a
 * workspace look like a real restaurant rather than a spreadsheet.
 *
 * Bangladeshi tenants (BDT / country BD) get the Dhaka catalog; everyone else
 * gets the international bistro catalog.
 */
class DemoProfile
{
    public function __construct(protected Tenant $tenant) {}

    public static function for(Tenant $tenant): self
    {
        return new self($tenant);
    }

    public function locale(): string
    {
        $currency = strtoupper((string) $this->tenant->getSetting('region.currency', ''));
        $country = strtoupper((string) $this->tenant->getSetting('region.country', ''));

        return $currency === 'BDT' || $country === 'BD' ? 'bd' : 'intl';
    }

    public function isBangladeshi(): bool
    {
        return $this->locale() === 'bd';
    }

    public function currency(): string
    {
        $currency = strtoupper((string) $this->tenant->getSetting('region.currency', ''));

        if ($currency !== '') {
            return $currency;
        }

        return $this->catalog()::currency();
    }

    /** @return class-string<BengaliMenu|InternationalMenu> */
    public function catalog(): string
    {
        return $this->isBangladeshi() ? BengaliMenu::class : InternationalMenu::class;
    }

    public function names(): NamePool
    {
        return new NamePool($this->locale());
    }

    public function emailDomain(): string
    {
        return $this->tenant->slug.'.demo.invalid';
    }

    /** @return list<array<string, mixed>> */
    public function menu(): array
    {
        return $this->catalog()::menu();
    }

    /** @return array<string, array{name: string, unit: string, cost: float}> */
    public function ingredients(): array
    {
        return $this->catalog()::ingredients();
    }

    /** @return array<string, array<string, mixed>> */
    public function modifiers(): array
    {
        return $this->catalog()::modifiers();
    }

    /** @return list<array<string, mixed>> */
    public function suppliers(): array
    {
        return $this->catalog()::suppliers();
    }

    /** @return list<array<string, float>> */
    public function zones(): array
    {
        return $this->catalog()::zones();
    }

    /** @return list<array{name: string, key: string}> */
    public function stations(): array
    {
        return $this->catalog()::stations();
    }

    /** @return array<string, list<string>> */
    public function images(): array
    {
        return $this->catalog()::images();
    }

    /** @return list<array<string, mixed>> */
    public function expenses(): array
    {
        return $this->catalog()::expenses();
    }

    /** @return list<string> */
    public function feedbackComments(): array
    {
        return $this->catalog()::feedbackComments();
    }

    public function openingFloat(): float
    {
        return $this->catalog()::openingFloat();
    }

    public function lowStockThreshold(): float
    {
        return $this->catalog()::lowStockThreshold();
    }

    public function wasteApprovalThreshold(): float
    {
        return $this->catalog()::wasteApprovalThreshold();
    }

    /** Name of the second branch the demo adds (the first is the owner's own). */
    public function annexBranchName(): string
    {
        return $this->isBangladeshi() ? 'Dhanmondi Branch' : 'Riverside Branch';
    }

    /** @return list<string> */
    public function diningAreas(): array
    {
        return $this->isBangladeshi()
            ? ['Indoor Hall', 'Rooftop Terrace', 'Family Cabin']
            : ['Main Hall', 'Terrace', 'Mezzanine'];
    }

    public function levelOne(): string
    {
        return $this->isBangladeshi() ? 'Ground Floor' : 'Ground Floor';
    }

    public function levelTwo(): string
    {
        return $this->isBangladeshi() ? 'First Floor' : 'Upper Floor';
    }

    /**
     * The demo team: real roles, one branch each, and a couple of senior staff
     * who hold a manager PIN so approvals can be demonstrated.
     *
     * @return list<array<string, mixed>>
     */
    public function staff(): array
    {
        return [
            ['key' => 'manager', 'role' => 'branch_manager', 'branch' => 'primary', 'pin' => '2468', 'title' => 'Branch Manager'],
            ['key' => 'supervisor', 'role' => 'supervisor', 'branch' => 'primary', 'pin' => '1357', 'title' => 'Floor Supervisor'],
            ['key' => 'cashier1', 'role' => 'cashier', 'branch' => 'primary', 'custom_role' => 'shift_lead', 'registers' => true],
            ['key' => 'cashier2', 'role' => 'cashier', 'branch' => 'annex', 'registers' => true],
            ['key' => 'waiter1', 'role' => 'table_staff', 'branch' => 'primary', 'serves' => true],
            ['key' => 'waiter2', 'role' => 'table_staff', 'branch' => 'annex', 'serves' => true],
            ['key' => 'kitchen1', 'role' => 'kitchen_staff', 'branch' => 'primary'],
            ['key' => 'inventory', 'role' => 'inventory_manager', 'branch' => 'primary'],
            ['key' => 'accountant', 'role' => 'accountant', 'branch' => 'primary', 'custom_role' => 'billing_clerk'],
        ];
    }

    /**
     * Manager PIN held by the demo's most senior staff member — demo accounts
     * cannot sign in, it exists so approvals (voids, overrides) work.
     */
    public function managerPin(): string
    {
        foreach ($this->staff() as $member) {
            if (($member['key'] ?? null) === 'manager') {
                return (string) ($member['pin'] ?? '2468');
            }
        }

        return '2468';
    }

    /**
     * Tenant-defined roles, to show the Roles module with something editable
     * next to the protected built-in roles.
     *
     * @return array<string, array{name: string, description: string, permissions: list<string>}>
     */
    public function customRoles(): array
    {
        return [
            'shift_lead' => [
                'name' => 'Shift Lead',
                'description' => 'Runs a shift: takes and approves orders, manages tables and the till.',
                'permissions' => [
                    'dashboard.view', 'pos.use',
                    'orders.view', 'orders.create', 'orders.update', 'orders.approve',
                    'tables.view', 'tables.manage', 'kitchen.view', 'kitchen.manage',
                    'customers.view', 'cash.view', 'cash.manage', 'invoices.view',
                ],
            ],
            'billing_clerk' => [
                'name' => 'Billing Clerk',
                'description' => 'Handles invoices, expenses and account reconciliation.',
                'permissions' => [
                    'dashboard.view', 'invoices.view', 'invoices.manage',
                    'accounts.view', 'accounts.manage', 'expenses.view', 'expenses.manage',
                    'cash.view', 'customers.view', 'reports.view',
                ],
            ],
        ];
    }

    /**
     * Guest list for the demo. Regulars repeat so segmentation and loyalty have
     * something real to work with.
     *
     * @return list<array<string, mixed>>
     */
    public function customers(int $count, DemoRandom $random): array
    {
        $names = $this->names();
        $customers = [];

        for ($i = 0; $i < $count; $i++) {
            $name = $names->person($random);
            $isRegular = $random->bool(0.35);

            $tags = match (true) {
                $random->bool(0.08) => ['vip'],
                $isRegular => ['regular'],
                default => ['new'],
            };

            $customers[] = [
                'name' => $name,
                'phone' => $names->phone($random),
                'email' => $random->bool(0.6) ? $names->email($name, $i + 1, $this->emailDomain()) : null,
                'tags' => $tags,
                'marketing' => $random->bool(0.45),
                'weight' => $isRegular ? 4 : 1,
                'notes' => $random->bool(0.12) ? 'Prefers a quiet corner table.' : null,
            ];
        }

        return $customers;
    }

    /**
     * Waste the demo records: mostly routine spoilage, a couple of expensive
     * items that trip the approval threshold.
     *
     * @return list<array<string, mixed>>
     */
    public function wastePlan(): array
    {
        return $this->isBangladeshi()
            ? [
                ['item' => 'onion', 'reason' => 'spoilage', 'quantity' => 3.0, 'note' => 'Soft onions found during prep'],
                ['item' => 'tomato', 'reason' => 'damage', 'quantity' => 2.5, 'note' => 'Crushed in delivery'],
                ['item' => 'beef', 'reason' => 'spoilage', 'quantity' => 1.5, 'note' => 'Left out of the chiller overnight'],
            ]
            : [
                ['item' => 'lettuce', 'reason' => 'spoilage', 'quantity' => 1.5, 'note' => 'Wilted leaves'],
                ['item' => 'tomato', 'reason' => 'damage', 'quantity' => 2.0, 'note' => 'Crushed in transit'],
                ['item' => 'salmon', 'reason' => 'spoilage', 'quantity' => 1.5, 'note' => 'Missed date check'],
            ];
    }

    /**
     * Purchase orders the demo raises across the window.
     *
     * @return list<array<string, mixed>>
     */
    public function purchasePlan(): array
    {
        return $this->isBangladeshi()
            ? [
                ['day' => '-3', 'supplier' => 0, 'state' => 'received', 'items' => [['ingredient' => 'basmati_rice', 'quantity' => 30], ['ingredient' => 'soybean_oil', 'quantity' => 12]]],
                ['day' => '-2', 'supplier' => 2, 'state' => 'partially_received', 'items' => [['ingredient' => 'chicken', 'quantity' => 20], ['ingredient' => 'mutton', 'quantity' => 8]]],
                ['day' => '-1', 'supplier' => 0, 'state' => 'approved', 'items' => [['ingredient' => 'ghee', 'quantity' => 4], ['ingredient' => 'spice_mix', 'quantity' => 2]]],
                ['day' => '-1', 'supplier' => 3, 'state' => 'draft', 'items' => [['ingredient' => 'milk', 'quantity' => 20], ['ingredient' => 'yogurt', 'quantity' => 10]]],
            ]
            : [
                ['day' => '-3', 'supplier' => 0, 'state' => 'received', 'items' => [['ingredient' => 'tomato', 'quantity' => 20], ['ingredient' => 'lettuce', 'quantity' => 10]]],
                ['day' => '-2', 'supplier' => 4, 'state' => 'partially_received', 'items' => [['ingredient' => 'milk', 'quantity' => 20], ['ingredient' => 'cream', 'quantity' => 8]]],
                ['day' => '-1', 'supplier' => 3, 'state' => 'approved', 'items' => [['ingredient' => 'salmon', 'quantity' => 8], ['ingredient' => 'prawn', 'quantity' => 6]]],
                ['day' => '-1', 'supplier' => 2, 'state' => 'draft', 'items' => [['ingredient' => 'pasta', 'quantity' => 12], ['ingredient' => 'olive_oil', 'quantity' => 6]]],
            ];
    }

    /** Opening stock multiplier so the trading window never runs dry. */
    public function openingStockFactor(): float
    {
        return 3.0;
    }
}
