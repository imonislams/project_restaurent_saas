<?php

namespace App\Domain\POS;

use App\Domain\POS\Models\OfflineSyncConflict;
use App\Models\User;

/**
 * Records a replayed offline operation that needs a human to look at it, so the
 * difference between what the device charged and what the server recorded never
 * disappears into a log line.
 */
class OfflineConflictRecorder
{
    /**
     * @param  array<string, mixed>  $operation
     * @param  array<string, mixed>  $attributes
     */
    public function record(
        array $operation,
        string $type,
        string $message,
        array $attributes = [],
        ?User $user = null,
    ): OfflineSyncConflict {
        return OfflineSyncConflict::create(array_merge([
            'tenant_id' => $user?->tenant_id,
            'branch_id' => $operation['payload']['branch_id'] ?? null,
            'offline_uuid' => (string) ($operation['uuid'] ?? ''),
            'operation_type' => (string) ($operation['type'] ?? ''),
            'order_reference' => $operation['offline_reference'] ?? null,
            'type' => $type,
            'status' => OfflineSyncConflict::STATUS_OPEN,
            'message' => $message,
            'payload' => $operation['payload'] ?? null,
        ], $attributes));
    }
}
