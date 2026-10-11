<?php

namespace App\Domain\Tenancy\Concerns;

use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Applies tenant scoping to a model.
 *
 * - Adds a global scope that constrains queries to the current tenant.
 * - Auto-fills tenant_id on creation from the current tenant context.
 *
 * The tenant is resolved from the TenantContext, falling back to the
 * authenticated user. The fallback matters because route model binding runs
 * before the ResolveTenant middleware, so scoping must not depend solely on the
 * context being set — otherwise cross-tenant records could be bound.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = static::currentTenantId();

            if ($tenantId !== null) {
                $builder->where(
                    $builder->getModel()->getTable().'.tenant_id',
                    $tenantId
                );
            }
        });

        static::creating(function ($model) {
            if ($model->tenant_id === null && ($tenantId = static::currentTenantId()) !== null) {
                $model->tenant_id = $tenantId;
            }
        });
    }

    protected static function currentTenantId(): ?int
    {
        $context = app(TenantContext::class);

        if ($context->has()) {
            return $context->tenantId();
        }

        return auth()->user()?->tenant_id;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
