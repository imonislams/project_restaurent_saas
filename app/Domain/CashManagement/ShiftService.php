<?php

namespace App\Domain\CashManagement;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Notifications\NotificationService;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class ShiftService
{
    public function __construct(
        protected CashService $cash,
        protected ManagerPinService $pins,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    public function open(Branch $branch, User $user, float $openingFloat, ?int $registerId = null): Shift
    {
        if ($openingFloat < 0) {
            throw ValidationException::withMessages(['opening_float' => 'Opening float cannot be negative.']);
        }

        $existing = Shift::query()
            ->where('branch_id', $branch->getKey())
            ->open()
            ->when($registerId, fn ($q) => $q->where('register_id', $registerId))
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages(['shift' => 'A shift is already open for this register.']);
        }

        $shift = Shift::create([
            'tenant_id' => $branch->tenant_id,
            'branch_id' => $branch->getKey(),
            'register_id' => $registerId,
            'opened_by' => $user->getKey(),
            'opening_float' => round($openingFloat, 2),
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $this->audit->log('shift.opened', $shift, ['opening_float' => $shift->opening_float], $user, $branch->tenant_id);

        return $shift;
    }

    public function close(Shift $shift, User $user, float $countedCash, ?string $managerPin = null, ?string $notes = null): Shift
    {
        if (! $shift->isOpen()) {
            throw ValidationException::withMessages(['shift' => 'This shift is already closed.']);
        }

        $expected = $shift->currentExpectedCash();
        $overage = round($countedCash - $expected, 2);

        $threshold = $this->context->tenant()?->getSetting('pos.cash_variance_threshold');

        if ($threshold !== null && abs($overage) > (float) $threshold) {
            if (! $managerPin || ! $this->pins->verify($this->context->tenant(), $managerPin)) {
                throw ValidationException::withMessages([
                    'manager_pin' => 'The cash variance exceeds the allowed threshold and requires manager approval.',
                ]);
            }
        }

        $shift->forceFill([
            'counted_cash' => round($countedCash, 2),
            'expected_cash' => $expected,
            'overage_shortage' => $overage,
            'status' => 'closed',
            'closed_by' => $user->getKey(),
            'closed_at' => now(),
            'notes' => $notes,
        ])->save();

        $this->audit->log('shift.closed', $shift, [
            'expected_cash' => $expected,
            'counted_cash' => $shift->counted_cash,
            'overage_shortage' => $overage,
        ], $user, $shift->tenant_id);

        // Best-effort operational alert; never affects the close.
        try {
            if (abs($overage) >= 0.01) {
                app(NotificationService::class)->shiftVariance($shift);
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return $shift;
    }
}
