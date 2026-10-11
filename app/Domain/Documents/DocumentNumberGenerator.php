<?php

namespace App\Domain\Documents;

use App\Domain\Documents\Models\DocumentSequence;

/**
 * Gap-free, per-tenant document numbering (purchase orders, goods receipts,
 * transfers, ...). Must be called inside a transaction.
 */
class DocumentNumberGenerator
{
    public function next(int $tenantId, string $type, ?string $prefix = null): string
    {
        $sequence = DocumentSequence::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('type', $type)
            ->lockForUpdate()
            ->first();

        if (! $sequence) {
            $sequence = DocumentSequence::create([
                'tenant_id' => $tenantId,
                'type' => $type,
                'last_number' => 0,
            ]);
        }

        $sequence->last_number = $sequence->last_number + 1;
        $sequence->save();

        $prefix ??= strtoupper(substr($type, 0, 3));

        return sprintf('%s-%s-%04d', $prefix, now()->format('Ymd'), $sequence->last_number);
    }
}
