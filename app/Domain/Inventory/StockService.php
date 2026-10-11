<?php

namespace App\Domain\Inventory;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The single writer of stock. Every quantity change is recorded as an
 * append-only stock movement, and the cached balance is updated in the same
 * transaction. Balances are never edited directly by other modules.
 */
class StockService
{
    public function __construct(
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    public function record(
        Model $stockable,
        StockLocation $location,
        float $delta,
        StockMovementReason $reason,
        ?float $unitCost = null,
        ?Model $source = null,
        ?string $note = null,
        ?bool $allowNegative = null,
    ): StockMovement {
        return DB::transaction(function () use ($stockable, $location, $delta, $reason, $unitCost, $source, $note, $allowNegative) {
            $balance = $this->lockBalance($stockable, $location);

            $newQuantity = round((float) $balance->quantity + $delta, 3);
            $allow = $allowNegative ?? $this->allowsNegativeStock();

            if ($newQuantity < 0 && ! $allow) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient stock: this movement would leave {$newQuantity} on hand.",
                ]);
            }

            $balance->quantity = $newQuantity;
            $balance->save();

            return StockMovement::create([
                'tenant_id' => $location->tenant_id,
                'branch_id' => $location->branch_id,
                'stock_location_id' => $location->getKey(),
                'stockable_type' => $stockable->getMorphClass(),
                'stockable_id' => $stockable->getKey(),
                'quantity_delta' => $delta,
                'unit_cost' => $unitCost,
                'reason' => $reason,
                'source_type' => $source?->getMorphClass(),
                'source_id' => $source?->getKey(),
                'note' => $note,
                'created_by' => auth()->id(),
            ]);
        });
    }

    public function receiveOpening(Model $stockable, StockLocation $location, float $quantity, ?float $unitCost = null): StockMovement
    {
        return $this->record($stockable, $location, $quantity, StockMovementReason::Opening, $unitCost);
    }

    /**
     * Adjust the on-hand quantity to a counted value, recording the difference.
     */
    public function adjustTo(Model $stockable, StockLocation $location, float $counted, ?string $note = null): StockMovement
    {
        $current = $this->balanceFor($stockable, $location);
        $delta = round($counted - $current, 3);

        $movement = $this->record($stockable, $location, $delta, StockMovementReason::Adjustment, null, null, $note);

        $this->audit->log('stock.adjusted', $stockable, [
            'stock_location_id' => $location->getKey(),
            'from' => $current,
            'to' => $counted,
            'delta' => $delta,
        ]);

        return $movement;
    }

    public function balanceFor(Model $stockable, StockLocation $location): float
    {
        $balance = StockBalance::query()
            ->where('stock_location_id', $location->getKey())
            ->where('stockable_type', $stockable->getMorphClass())
            ->where('stockable_id', $stockable->getKey())
            ->first();

        return (float) ($balance?->quantity ?? 0);
    }

    public function totalFor(Model $stockable, ?int $branchId = null): float
    {
        $query = StockBalance::query()
            ->where('stockable_type', $stockable->getMorphClass())
            ->where('stockable_id', $stockable->getKey());

        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        return (float) $query->sum('quantity');
    }

    protected function lockBalance(Model $stockable, StockLocation $location): StockBalance
    {
        $balance = StockBalance::query()
            ->where('stock_location_id', $location->getKey())
            ->where('stockable_type', $stockable->getMorphClass())
            ->where('stockable_id', $stockable->getKey())
            ->lockForUpdate()
            ->first();

        if ($balance) {
            return $balance;
        }

        return StockBalance::create([
            'tenant_id' => $location->tenant_id,
            'branch_id' => $location->branch_id,
            'stock_location_id' => $location->getKey(),
            'stockable_type' => $stockable->getMorphClass(),
            'stockable_id' => $stockable->getKey(),
            'quantity' => 0,
        ]);
    }

    protected function allowsNegativeStock(): bool
    {
        return (bool) ($this->context->tenant()?->getSetting('inventory.allow_negative', false) ?? false);
    }
}
