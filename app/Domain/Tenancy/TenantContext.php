<?php

namespace App\Domain\Tenancy;

use App\Domain\Tenancy\Models\Tenant;

/**
 * Holds the resolved tenant for the current request/job.
 *
 * Resolved exclusively from trusted server-side context (the authenticated
 * user), never from a client-supplied identifier. Registered as a singleton.
 */
class TenantContext
{
    protected ?Tenant $tenant = null;

    protected ?int $branchId = null;

    public function set(Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function tenant(): ?Tenant
    {
        return $this->tenant;
    }

    public function tenantId(): ?int
    {
        return $this->tenant?->getKey();
    }

    public function has(): bool
    {
        return $this->tenant !== null;
    }

    public function branchId(): ?int
    {
        return $this->branchId;
    }

    public function setBranchId(?int $branchId): void
    {
        $this->branchId = $branchId;
    }

    public function forget(): void
    {
        $this->tenant = null;
        $this->branchId = null;
    }
}
