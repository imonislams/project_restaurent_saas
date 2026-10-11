<?php

namespace App\Domain\Accounting\Actions;

use App\Domain\Accounting\Enums\AccountType;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\Models\Tenant;

/**
 * Seeds default financial accounts so cash/expenses are usable immediately.
 */
class ProvisionAccountingDefaults
{
    public function forTenant(Tenant $tenant): void
    {
        if ($tenant->financialAccounts()->exists()) {
            return;
        }

        $tenant->financialAccounts()->create([
            'name' => 'Bank Account',
            'type' => AccountType::Bank,
            'opening_balance' => 0,
            'is_active' => true,
        ]);
    }

    public function cashAccountFor(Branch $branch): FinancialAccount
    {
        $existing = $branch->financialAccounts()->where('type', AccountType::Cash->value)->first();

        if ($existing) {
            return $existing;
        }

        return $branch->financialAccounts()->create([
            'tenant_id' => $branch->tenant_id,
            'name' => 'Cash • '.$branch->name,
            'type' => AccountType::Cash,
            'opening_balance' => 0,
            'is_active' => true,
        ]);
    }
}
