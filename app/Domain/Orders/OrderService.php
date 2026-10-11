<?php

namespace App\Domain\Orders;

use App\Domain\Auditing\AuditLogger;
use App\Domain\CashManagement\CashService;
use App\Domain\CashManagement\Enums\CashMovementType;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\StockService;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Tables\TableService;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Order lifecycle actions beyond creation (void/cancel with reversal).
 */
class OrderService
{
    public function __construct(
        protected StockService $stock,
        protected CashService $cash,
        protected ManagerPinService $pins,
        protected KitchenService $kitchen,
        protected TableService $tables,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    /**
     * Void a completed order, reversing stock and (where the shift is still
     * open) the cash taken. Requires manager approval.
     */
    public function void(Order $order, User $user, ?string $managerPin = null): Order
    {
        if (! $order->canBeVoided()) {
            throw ValidationException::withMessages(['order' => 'Only completed orders can be voided.']);
        }

        $tenant = $this->context->tenant();

        if (! $managerPin || ! $this->pins->verify($tenant, $managerPin)) {
            throw ValidationException::withMessages(['manager_pin' => 'A manager PIN is required to void an order.']);
        }

        return DB::transaction(function () use ($order, $user) {
            $branch = $order->branch;
            $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);

            foreach ($order->items()->get() as $item) {
                $product = $item->product;

                if (! $product) {
                    continue;
                }

                if ($product->inventory_mode === InventoryMode::Product) {
                    $this->stock->record(
                        $product, $location, (float) $item->quantity,
                        StockMovementReason::Return, (float) $item->unit_cost, $order, 'Void '.$order->order_number, true,
                    );
                } elseif ($product->inventory_mode === InventoryMode::Recipe) {
                    $recipe = $product->recipe()->where('is_active', true)->with('items.ingredient')->first();

                    if (! $recipe) {
                        continue;
                    }

                    $yield = (float) $recipe->yield_quantity ?: 1.0;

                    foreach ($recipe->items as $recipeItem) {
                        if (! $recipeItem->ingredient) {
                            continue;
                        }

                        $quantity = round((float) $recipeItem->quantity / $yield * (float) $item->quantity, 3);
                        $this->stock->record(
                            $recipeItem->ingredient, $location, $quantity,
                            StockMovementReason::Return, null, $order, 'Void '.$order->order_number, true,
                        );
                    }
                }
            }

            $cashPaid = (float) $order->payments()
                ->whereHas('method', fn ($q) => $q->where('type', 'cash'))
                ->sum('amount');

            if ($cashPaid > 0 && $order->shift && $order->shift->isOpen()) {
                $this->cash->record($order->shift, CashMovementType::Refund, -$cashPaid, $order, 'Void '.$order->order_number);
            }

            $order->payments()->update(['status' => PaymentStatus::Refunded->value]);

            $order->forceFill([
                'status' => OrderStatus::Voided,
                'voided_at' => now(),
            ])->save();

            $order->statusHistory()->create([
                'tenant_id' => $order->tenant_id,
                'status' => OrderStatus::Voided,
                'user_id' => $user->getKey(),
                'note' => 'Order voided',
            ]);

            $this->audit->log('order.voided', $order, [
                'order_number' => $order->order_number,
                'total' => (float) $order->total,
            ], $user, $order->tenant_id);

            return $order->fresh(['items', 'payments']);
        });

        $this->kitchen->cancelForOrder($order);
        $this->tables->refreshForOrder($order);

        return $order->fresh(['items', 'payments']);
    }

    /**
     * Move a completed/held order through its fulfillment statuses.
     */
    public function setFulfillmentStatus(Order $order, FulfillmentStatus $status, User $user): Order
    {
        if (! $order->fulfillment_status->canTransitionTo($status)) {
            throw ValidationException::withMessages([
                'fulfillment_status' => "Cannot move from \"{$order->fulfillment_status->label()}\" to \"{$status->label()}\".",
            ]);
        }

        $order->forceFill(['fulfillment_status' => $status])->save();

        $order->statusHistory()->create([
            'tenant_id' => $order->tenant_id,
            'status' => $order->status,
            'user_id' => $user->getKey(),
            'note' => 'Fulfillment: '.$status->label(),
        ]);

        $this->audit->log('order.fulfillment_changed', $order, ['fulfillment_status' => $status->value], $user, $order->tenant_id);

        return $order;
    }
}
