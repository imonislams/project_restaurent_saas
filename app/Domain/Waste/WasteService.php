<?php

namespace App\Domain\Waste;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\StockItemResolver;
use App\Domain\Inventory\StockService;
use App\Domain\Tenancy\TenantContext;
use App\Domain\Waste\Enums\WasteReason;
use App\Domain\Waste\Models\WasteRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Waste recording. Waste always creates a stock movement (when approved), is
 * kept separate from sales/refunds, and above a tenant threshold it requires
 * approval before it affects stock.
 */
class WasteService
{
    public function __construct(
        protected StockService $stock,
        protected ProvisionInventoryDefaults $defaults,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    /**
     * @param  array{item_type: string, item_id: int, branch_id: int, quantity: float, reason: string, notes?: ?string}  $data
     */
    public function record(array $data, User $user): WasteRecord
    {
        $item = StockItemResolver::resolve($data['item_type'], (int) $data['item_id']);
        $branch = Branch::query()->findOrFail($data['branch_id']);
        $location = $this->defaults->defaultLocationFor($branch);

        $quantity = round((float) $data['quantity'], 3);

        if ($quantity <= 0) {
            throw ValidationException::withMessages(['quantity' => 'Quantity must be greater than zero.']);
        }

        $unitCost = StockItemResolver::unitCost($item);
        $cost = round($quantity * $unitCost, 2);

        $threshold = $this->context->tenant()?->getSetting('waste.approval_threshold');
        $requiresApproval = $threshold !== null && $cost > (float) $threshold;

        return DB::transaction(function () use ($data, $item, $location, $quantity, $unitCost, $cost, $user, $requiresApproval) {
            $record = WasteRecord::create([
                'tenant_id' => $location->tenant_id,
                'branch_id' => $location->branch_id,
                'stock_location_id' => $location->getKey(),
                'item_type' => $data['item_type'],
                'item_id' => $item->getKey(),
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'cost' => $cost,
                'reason' => WasteReason::from($data['reason']),
                'status' => $requiresApproval ? 'pending' : 'approved',
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $user->getKey(),
            ]);

            if (! $requiresApproval) {
                $this->deduct($record, $item, $location, $user);
            }

            $this->audit->log('waste.recorded', $record, [
                'quantity' => $quantity,
                'cost' => $cost,
                'reason' => $data['reason'],
                'requires_approval' => $requiresApproval,
            ], $user, $location->tenant_id);

            return $record;
        });
    }

    public function approve(WasteRecord $record, User $user): WasteRecord
    {
        if ($record->status !== 'pending') {
            throw ValidationException::withMessages(['status' => 'Only pending waste records can be approved.']);
        }

        DB::transaction(function () use ($record, $user) {
            $location = $record->stockLocation
                ?? $this->defaults->defaultLocationFor(Branch::query()->findOrFail($record->branch_id));

            $this->deduct($record, $record->item, $location, $user);

            $record->forceFill([
                'status' => 'approved',
                'approved_by' => $user->getKey(),
                'approved_at' => now(),
            ])->save();

            $this->audit->log('waste.approved', $record, [], $user, $record->tenant_id);
        });

        return $record->fresh();
    }

    public function reject(WasteRecord $record, User $user): WasteRecord
    {
        if ($record->status !== 'pending') {
            throw ValidationException::withMessages(['status' => 'Only pending waste records can be rejected.']);
        }

        $record->forceFill([
            'status' => 'rejected',
            'approved_by' => $user->getKey(),
            'approved_at' => now(),
        ])->save();

        $this->audit->log('waste.rejected', $record, [], $user, $record->tenant_id);

        return $record;
    }

    protected function deduct(WasteRecord $record, object $item, $location, User $user): void
    {
        $this->stock->record(
            $item,
            $location,
            -1 * (float) $record->quantity,
            StockMovementReason::Waste,
            (float) $record->unit_cost,
            $record,
            'Waste: '.$record->reason->label(),
            true,
        );
    }
}
