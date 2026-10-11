<?php

namespace App\Domain\Purchasing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Documents\DocumentNumberGenerator;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\StockItemResolver;
use App\Domain\Inventory\StockService;
use App\Domain\Purchasing\Enums\PurchaseOrderStatus;
use App\Domain\Purchasing\Models\GoodsReceipt;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Purchasing\Models\PurchaseOrderItem;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Purchasing\Models\SupplierPayment;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Purchase orders and goods receiving. Inventory is updated **only** when goods
 * are received against a confirmed receipt.
 */
class PurchasingService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected StockService $stock,
        protected ProvisionInventoryDefaults $defaults,
        protected ManagerPinService $pins,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    /**
     * @param  array{supplier_id: int, branch_id: int, notes?: ?string, items: list<array<string, mixed>>}  $data
     */
    public function create(array $data, User $user): PurchaseOrder
    {
        $tenant = $this->context->tenant() ?? $user->tenant;
        Supplier::query()->findOrFail($data['supplier_id']);

        return DB::transaction(function () use ($data, $user, $tenant) {
            $order = PurchaseOrder::create([
                'tenant_id' => $tenant->getKey(),
                'branch_id' => $data['branch_id'],
                'supplier_id' => $data['supplier_id'],
                'number' => $this->numbers->next($tenant->getKey(), 'purchase_order', 'PO'),
                'status' => PurchaseOrderStatus::Draft,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->getKey(),
            ]);

            $this->syncItems($order, $data['items']);

            $this->audit->log('purchase_order.created', $order, ['number' => $order->number], $user, $tenant->getKey());

            return $order->load('items');
        });
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    public function update(PurchaseOrder $order, array $items, User $user): PurchaseOrder
    {
        if (! $order->status->isEditable()) {
            throw ValidationException::withMessages(['status' => 'Only draft orders can be edited.']);
        }

        return DB::transaction(function () use ($order, $items, $user) {
            $order->items()->delete();
            $this->syncItems($order, $items);

            $this->audit->log('purchase_order.updated', $order, [], $user, $order->tenant_id);

            return $order->fresh('items');
        });
    }

    public function submit(PurchaseOrder $order, User $user): PurchaseOrder
    {
        if (! $order->status->isEditable()) {
            throw ValidationException::withMessages(['status' => 'Only draft orders can be submitted.']);
        }

        $order->forceFill([
            'status' => PurchaseOrderStatus::Submitted,
            'ordered_at' => now(),
        ])->save();

        $this->audit->log('purchase_order.submitted', $order, [], $user, $order->tenant_id);

        return $order;
    }

    public function approve(PurchaseOrder $order, User $user, ?string $managerPin = null): PurchaseOrder
    {
        if ($order->status !== PurchaseOrderStatus::Submitted) {
            throw ValidationException::withMessages(['status' => 'Only submitted orders can be approved.']);
        }

        $limit = $this->context->tenant()?->getSetting('purchasing.approval_limit');

        if ($limit !== null && (float) $order->total > (float) $limit) {
            if (! $managerPin || ! $this->pins->verify($this->context->tenant(), $managerPin)) {
                throw ValidationException::withMessages([
                    'manager_pin' => 'This order exceeds the approval limit and requires a manager PIN.',
                ]);
            }
        }

        $order->forceFill([
            'status' => PurchaseOrderStatus::Approved,
            'approved_by' => $user->getKey(),
            'approved_at' => now(),
        ])->save();

        $this->audit->log('purchase_order.approved', $order, ['total' => (float) $order->total], $user, $order->tenant_id);

        return $order;
    }

    public function cancel(PurchaseOrder $order, User $user): PurchaseOrder
    {
        if (in_array($order->status, [PurchaseOrderStatus::Received, PurchaseOrderStatus::Cancelled], true)) {
            throw ValidationException::withMessages(['status' => 'This order can no longer be cancelled.']);
        }

        $order->forceFill(['status' => PurchaseOrderStatus::Cancelled])->save();

        $this->audit->log('purchase_order.cancelled', $order, [], $user, $order->tenant_id);

        return $order;
    }

    /**
     * Receive goods against an approved order.
     *
     * @param  list<array{purchase_order_item_id: int, quantity: float, rejected_quantity?: float, unit_cost?: float, note?: ?string}>  $lines
     */
    public function receive(PurchaseOrder $order, array $lines, User $user): GoodsReceipt
    {
        if (! $order->status->isReceivable()) {
            throw ValidationException::withMessages(['status' => 'Goods can only be received against approved orders.']);
        }

        return DB::transaction(function () use ($order, $lines, $user) {
            $branch = Branch::query()->findOrFail($order->branch_id);
            $location = $this->defaults->defaultLocationFor($branch);

            $receipt = GoodsReceipt::create([
                'tenant_id' => $order->tenant_id,
                'branch_id' => $order->branch_id,
                'purchase_order_id' => $order->getKey(),
                'number' => $this->numbers->next($order->tenant_id, 'goods_receipt', 'GRN'),
                'received_by' => $user->getKey(),
                'received_at' => now(),
            ]);

            foreach ($lines as $line) {
                $orderItem = PurchaseOrderItem::query()->findOrFail($line['purchase_order_item_id']);
                $quantity = round((float) $line['quantity'], 3);

                if ($quantity <= 0) {
                    continue;
                }

                $unitCost = isset($line['unit_cost']) ? (float) $line['unit_cost'] : (float) $orderItem->unit_cost;

                $receipt->items()->create([
                    'tenant_id' => $order->tenant_id,
                    'purchase_order_item_id' => $orderItem->getKey(),
                    'item_type' => $orderItem->item_type,
                    'item_id' => $orderItem->item_id,
                    'quantity' => $quantity,
                    'rejected_quantity' => (float) ($line['rejected_quantity'] ?? 0),
                    'unit_cost' => $unitCost,
                    'note' => $line['note'] ?? null,
                ]);

                $orderItem->forceFill([
                    'received_quantity' => round((float) $orderItem->received_quantity + $quantity, 3),
                ])->save();

                $item = StockItemResolver::resolve($orderItem->item_type, (int) $orderItem->item_id);

                $this->stock->record(
                    $item,
                    $location,
                    $quantity,
                    StockMovementReason::Purchase,
                    $unitCost,
                    $receipt,
                    'Received '.$order->number,
                    true,
                );
            }

            $order->forceFill([
                'status' => $order->fullyReceived()
                    ? PurchaseOrderStatus::Received
                    : PurchaseOrderStatus::PartiallyReceived,
            ])->save();

            $this->audit->log('goods_received', $receipt, ['number' => $receipt->number, 'order' => $order->number], $user, $order->tenant_id);

            return $receipt->load('items');
        });
    }

    /**
     * @param  array{amount: float, method?: string, reference?: ?string, notes?: ?string, paid_at?: ?string}  $data
     */
    public function recordPayment(Supplier $supplier, array $data, User $user, ?PurchaseOrder $order = null): SupplierPayment
    {
        if ((float) $data['amount'] <= 0) {
            throw ValidationException::withMessages(['amount' => 'Payment amount must be greater than zero.']);
        }

        $payment = SupplierPayment::create([
            'tenant_id' => $supplier->tenant_id,
            'supplier_id' => $supplier->getKey(),
            'purchase_order_id' => $order?->getKey(),
            'amount' => round((float) $data['amount'], 2),
            'method' => $data['method'] ?? 'cash',
            'reference' => $data['reference'] ?? null,
            'paid_at' => isset($data['paid_at']) ? $data['paid_at'] : now(),
            'notes' => $data['notes'] ?? null,
            'created_by' => $user->getKey(),
        ]);

        $this->audit->log('supplier.payment_recorded', $payment, [
            'supplier' => $supplier->name,
            'amount' => (float) $payment->amount,
        ], $user, $supplier->tenant_id);

        return $payment;
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    protected function syncItems(PurchaseOrder $order, array $items): void
    {
        if ($items === []) {
            throw ValidationException::withMessages(['items' => 'A purchase order needs at least one item.']);
        }

        $subtotal = 0.0;

        foreach ($items as $row) {
            $item = StockItemResolver::resolve($row['item_type'], (int) $row['item_id']);
            $quantity = round((float) $row['quantity'], 3);
            $unitCost = round((float) ($row['unit_cost'] ?? 0), 4);
            $lineTotal = round($quantity * $unitCost, 2);

            $order->items()->create([
                'tenant_id' => $order->tenant_id,
                'item_type' => $row['item_type'],
                'item_id' => $item->getKey(),
                'description' => $row['description'] ?? $item->name,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'line_total' => $lineTotal,
            ]);

            $subtotal += $lineTotal;
        }

        $order->forceFill([
            'subtotal' => round($subtotal, 2),
            'total' => round($subtotal, 2),
        ])->save();
    }
}
