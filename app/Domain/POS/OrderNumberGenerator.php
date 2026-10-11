<?php

namespace App\Domain\POS;

use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Models\OrderSequence;

/**
 * Branch-safe, gap-free order numbering. Must be called inside the sale
 * transaction — the sequence row is locked for the duration.
 */
class OrderNumberGenerator
{
    public function next(Branch $branch): string
    {
        $sequence = OrderSequence::query()
            ->where('tenant_id', $branch->tenant_id)
            ->where('branch_id', $branch->getKey())
            ->lockForUpdate()
            ->first();

        if (! $sequence) {
            $sequence = OrderSequence::create([
                'tenant_id' => $branch->tenant_id,
                'branch_id' => $branch->getKey(),
                'last_number' => 0,
            ]);
        }

        $sequence->last_number = $sequence->last_number + 1;
        $sequence->save();

        $prefix = $branch->code ?: 'BR'.$branch->getKey();

        return sprintf('%s-%s-%04d', $prefix, now()->format('Ymd'), $sequence->last_number);
    }
}
