<?php

namespace App\Domain\CashManagement;

use App\Domain\Auditing\AuditLogger;
use App\Domain\CashManagement\Enums\CashMovementType;
use App\Domain\CashManagement\Models\CashMovement;
use App\Domain\CashManagement\Models\Shift;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Writes the append-only cash ledger for a shift.
 */
class CashService
{
    public function __construct(protected AuditLogger $audit) {}

    public function record(
        Shift $shift,
        CashMovementType $type,
        float $amount,
        ?Model $source = null,
        ?string $reason = null,
    ): CashMovement {
        if (! $shift->isOpen()) {
            throw ValidationException::withMessages([
                'shift' => 'The cash drawer for this shift is closed.',
            ]);
        }

        return CashMovement::create([
            'tenant_id' => $shift->tenant_id,
            'branch_id' => $shift->branch_id,
            'shift_id' => $shift->getKey(),
            'type' => $type,
            'amount' => round($amount, 2),
            'reason' => $reason,
            'source_type' => $source?->getMorphClass(),
            'source_id' => $source?->getKey(),
            'created_by' => auth()->id(),
        ]);
    }

    public function cashIn(Shift $shift, float $amount, ?string $reason = null): CashMovement
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }

        return $this->record($shift, CashMovementType::CashIn, $amount, null, $reason);
    }

    public function cashOut(Shift $shift, float $amount, string $reason): CashMovement
    {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
        }

        return $this->record($shift, CashMovementType::CashOut, -$amount, null, $reason);
    }
}
