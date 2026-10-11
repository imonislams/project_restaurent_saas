<?php

namespace App\Domain\Branches;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Tenant branch management. Creating a branch also provisions its default stock
 * location and cash account. Creation is capped by the plan's branch limit.
 */
class BranchService
{
    public function __construct(protected AuditLogger $audit) {}

    public function assertWithinLimit(Tenant $tenant): void
    {
        $limit = $tenant->planLimit('branches');

        if ($limit === null) {
            return;
        }

        if ($tenant->branches()->count() >= $limit) {
            throw ValidationException::withMessages([
                'name' => "Your plan allows {$limit} branch(es). Upgrade your plan to add more.",
            ]);
        }
    }

    /** @param array<string, mixed> $data */
    public function create(Tenant $tenant, array $data, User $actor): Branch
    {
        $this->assertWithinLimit($tenant);

        return DB::transaction(function () use ($tenant, $data, $actor) {
            $isFirst = ! $tenant->branches()->exists();

            $branch = $tenant->branches()->create([
                'name' => $data['name'],
                'code' => $data['code'] ?? null,
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'timezone' => $data['timezone'] ?? null,
                'currency' => $data['currency'] ?? null,
                'service_types' => $data['service_types'] ?? [],
                'is_active' => true,
                'is_primary' => $isFirst,
            ]);

            app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);
            app(ProvisionAccountingDefaults::class)->cashAccountFor($branch);

            $this->audit->log('branch.created', $branch, ['name' => $branch->name], $actor, $tenant->getKey());

            return $branch;
        });
    }

    /** @param array<string, mixed> $data */
    public function update(Branch $branch, array $data, User $actor): Branch
    {
        $branch->update([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'timezone' => $data['timezone'] ?? null,
            'currency' => $data['currency'] ?? null,
            'service_types' => $data['service_types'] ?? [],
        ]);

        $this->audit->log('branch.updated', $branch, ['name' => $branch->name], $actor, $branch->tenant_id);

        return $branch;
    }

    public function deactivate(Branch $branch, User $actor): Branch
    {
        if ($branch->is_primary) {
            throw ValidationException::withMessages(['branch' => 'The primary branch cannot be deactivated. Set another branch as primary first.']);
        }

        $branch->forceFill(['is_active' => false])->save();

        $this->audit->log('branch.deactivated', $branch, ['name' => $branch->name], $actor, $branch->tenant_id);

        return $branch;
    }

    public function activate(Branch $branch, User $actor): Branch
    {
        $branch->forceFill(['is_active' => true])->save();

        $this->audit->log('branch.activated', $branch, ['name' => $branch->name], $actor, $branch->tenant_id);

        return $branch;
    }

    public function setPrimary(Branch $branch, User $actor): Branch
    {
        DB::transaction(function () use ($branch) {
            Branch::withoutGlobalScopes()
                ->where('tenant_id', $branch->tenant_id)
                ->update(['is_primary' => false]);

            $branch->forceFill(['is_primary' => true, 'is_active' => true])->save();
        });

        $this->audit->log('branch.primary_changed', $branch, ['name' => $branch->name], $actor, $branch->tenant_id);

        return $branch;
    }
}
