<?php

namespace App\Domain\Inventory;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Documents\DocumentNumberGenerator;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\Enums\TransferStatus;
use App\Domain\Inventory\Models\StockTransfer;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Inter-branch stock transfers with approval, dispatch and receiving.
 * Stock leaves the source branch on dispatch and arrives at the destination
 * branch on receiving.
 */
class TransferService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockService $stock,
        protected ProvisionInventoryDefaults $defaults,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    /**
     * @param  array{from_branch_id: int, to_branch_id: int, notes?: ?string, items: list<array<string, mixed>>}  $data
     */
    public function create(array $data, User $user): StockTransfer
    {
        if ((int) $data['from_branch_id'] === (int) $data['to_branch_id']) {
            throw ValidationException::withMessages(['to_branch_id' => 'Source and destination branches must differ.']);
        }

        $tenant = $this->context->tenant() ?? $user->tenant;

        return DB::transaction(function () use ($data, $user, $tenant) {
            $transfer = StockTransfer::create([
                'tenant_id' => $tenant->getKey(),
                'from_branch_id' => $data['from_branch_id'],
                'to_branch_id' => $data['to_branch_id'],
                'number' => $this->numbers->next($tenant->getKey(), 'stock_transfer', 'TRF'),
                'status' => TransferStatus::Draft,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->getKey(),
            ]);

            if (empty($data['items'])) {
                throw ValidationException::withMessages(['items' => 'A transfer needs at least one item.']);
            }

            foreach ($data['items'] as $row) {
                $item = StockItemResolver::resolve($row['item_type'], (int) $row['item_id']);

                $transfer->items()->create([
                    'tenant_id' => $tenant->getKey(),
                    'item_type' => $row['item_type'],
                    'item_id' => $item->getKey(),
                    'quantity' => round((float) $row['quantity'], 3),
                    'unit_cost' => isset($row['unit_cost'])
                        ? round((float) $row['unit_cost'], 4)
                        : StockItemResolver::unitCost($item),
                ]);
            }

            $this->audit->log('transfer.created', $transfer, ['number' => $transfer->number], $user, $tenant->getKey());

            return $transfer->load('items');
        });
    }

    public function approve(StockTransfer $transfer, User $user): StockTransfer
    {
        if ($transfer->status !== TransferStatus::Draft) {
            throw ValidationException::withMessages(['status' => 'Only draft transfers can be approved.']);
        }

        $transfer->forceFill(['status' => TransferStatus::Approved, 'approved_by' => $user->getKey()])->save();

        $this->audit->log('transfer.approved', $transfer, [], $user, $transfer->tenant_id);

        return $transfer;
    }

    public function dispatch(StockTransfer $transfer, User $user): StockTransfer
    {
        if ($transfer->status !== TransferStatus::Approved) {
            throw ValidationException::withMessages(['status' => 'Only approved transfers can be dispatched.']);
        }

        DB::transaction(function () use ($transfer, $user) {
            $location = $this->defaults->defaultLocationFor(Branch::query()->findOrFail($transfer->from_branch_id));

            foreach ($transfer->items()->with('item')->get() as $line) {
                $this->stock->record(
                    $line->item,
                    $location,
                    -1 * (float) $line->quantity,
                    StockMovementReason::TransferOut,
                    (float) $line->unit_cost,
                    $transfer,
                    'Transfer '.$transfer->number.' out',
                    true,
                );
            }

            $transfer->forceFill([
                'status' => TransferStatus::Dispatched,
                'dispatched_by' => $user->getKey(),
                'dispatched_at' => now(),
            ])->save();

            $this->audit->log('transfer.dispatched', $transfer, [], $user, $transfer->tenant_id);
        });

        return $transfer->fresh(['items']);
    }

    public function receive(StockTransfer $transfer, User $user): StockTransfer
    {
        if ($transfer->status !== TransferStatus::Dispatched) {
            throw ValidationException::withMessages(['status' => 'Only dispatched transfers can be received.']);
        }

        DB::transaction(function () use ($transfer, $user) {
            $location = $this->defaults->defaultLocationFor(Branch::query()->findOrFail($transfer->to_branch_id));

            foreach ($transfer->items()->with('item')->get() as $line) {
                $this->stock->record(
                    $line->item,
                    $location,
                    (float) $line->quantity,
                    StockMovementReason::TransferIn,
                    (float) $line->unit_cost,
                    $transfer,
                    'Transfer '.$transfer->number.' in',
                    true,
                );
            }

            $transfer->forceFill([
                'status' => TransferStatus::Received,
                'received_by' => $user->getKey(),
                'received_at' => now(),
            ])->save();

            $this->audit->log('transfer.received', $transfer, [], $user, $transfer->tenant_id);
        });

        return $transfer->fresh(['items']);
    }

    public function cancel(StockTransfer $transfer, User $user): StockTransfer
    {
        if (in_array($transfer->status, [TransferStatus::Dispatched, TransferStatus::Received, TransferStatus::Cancelled], true)) {
            throw ValidationException::withMessages(['status' => 'This transfer can no longer be cancelled.']);
        }

        $transfer->forceFill(['status' => TransferStatus::Cancelled])->save();

        $this->audit->log('transfer.cancelled', $transfer, [], $user, $transfer->tenant_id);

        return $transfer;
    }
}
