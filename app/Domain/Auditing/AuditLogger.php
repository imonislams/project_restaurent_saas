<?php

namespace App\Domain\Auditing;

use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes append-only audit records for sensitive administrative actions.
 *
 * The tenant is resolved from the explicit argument, then the acting user, then
 * the current tenant context — never from client input.
 */
class AuditLogger
{
    public function __construct(protected TenantContext $context) {}

    /**
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        string $action,
        ?Model $subject = null,
        array $metadata = [],
        ?User $actor = null,
        ?int $tenantId = null,
    ): AuditLog {
        $actor ??= auth()->user();

        return AuditLog::create([
            'tenant_id' => $tenantId ?? $actor?->tenant_id ?? $this->context->tenantId(),
            'user_id' => $actor?->getKey(),
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata ?: null,
            'ip_address' => request()->ip(),
        ]);
    }

    /**
     * Record an administrative change with explicit before/after values.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    public function logChange(
        string $action,
        ?Model $subject,
        array $before,
        array $after,
        ?User $actor = null,
        ?int $tenantId = null,
    ): AuditLog {
        return $this->log($action, $subject, [
            'before' => $before,
            'after' => $after,
        ], $actor, $tenantId);
    }
}
