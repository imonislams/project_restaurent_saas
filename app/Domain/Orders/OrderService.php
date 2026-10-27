<?php

namespace App\Domain\Orders;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\CashManagement\CashService;
use App\Domain\CashManagement\Enums\CashMovementType;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\StockService;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Menu\Enums\InventoryMode;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Realtime\Events\OrderActivity;
use App\Domain\Realtime\QrRealtime;
use App\Domain\Realtime\RealtimeBroadcaster;
use App\Domain\Tables\TableService;
use App\Domain\Tenancy\TenantContext;
use App\Jobs\OpenKitchenTicket;
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
        protected OrderConfirmationSettings $confirmation,
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

        DB::transaction(function () use ($order, $user) {
            $branch = $order->branch;

            $this->reverseStock($order, $branch, 'Void '.$order->order_number);

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

        app(RealtimeBroadcaster::class)->send(new OrderActivity($order, 'voided'));
        app(QrRealtime::class)->notifyOrder($order, 'voided');

        return $order->fresh(['items', 'payments']);
    }

    /**
     * Reverse stock for every line (shared by void and QR rejection).
     */
    protected function reverseStock(Order $order, Branch $branch, string $label): void
    {
        $location = app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);

        foreach ($order->items()->get() as $item) {
            $product = $item->product;

            if (! $product) {
                continue;
            }

            if ($product->inventory_mode === InventoryMode::Product) {
                $this->stock->record(
                    $product, $location, (float) $item->quantity,
                    StockMovementReason::Return, (float) $item->unit_cost, $order, $label, true,
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
                        StockMovementReason::Return, null, $order, $label, true,
                    );
                }
            }
        }
    }

    /**
     * Confirm a pending order (QR or table-staff) and send it to the kitchen.
     * Locked and idempotent: confirming an order that is no longer pending is
     * rejected rather than silently reporting success.
     */
    public function accept(Order $order, User $user): Order
    {
        $accepted = DB::transaction(function () use ($order, $user) {
            $locked = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->acceptance_status !== AcceptanceStatus::Pending) {
                throw ValidationException::withMessages([
                    'order' => 'This order is no longer awaiting confirmation.',
                ]);
            }

            $locked->forceFill([
                'acceptance_status' => AcceptanceStatus::Accepted,
                'accepted_at' => now(),
                'confirmed_by_user_id' => $user->getKey(),
            ])->save();

            $locked->statusHistory()->create([
                'tenant_id' => $locked->tenant_id,
                'status' => $locked->status,
                'user_id' => $user->getKey(),
                'note' => 'Order confirmed',
            ]);

            $this->audit->log('order.accepted', $locked, ['order_number' => $locked->order_number], $user, $locked->tenant_id);

            return $locked;
        });

        if ($this->confirmation->sendConfirmedToKitchen()) {
            $this->openKitchenTicket($accepted);
        }

        app(RealtimeBroadcaster::class)->send(new OrderActivity($accepted, 'accepted'));
        app(QrRealtime::class)->notifyOrder($accepted, 'accepted');

        return $accepted->fresh();
    }

    /**
     * Send a confirmed order to the kitchen immediately (so the ticket appears
     * without waiting for a queue worker or an application restart). If the
     * synchronous creation fails, fall back to the queued job so the failure is
     * retried rather than lost — the job and the service are both idempotent
     * per order, so a retry never duplicates the ticket.
     */
    protected function openKitchenTicket(Order $order): void
    {
        try {
            $this->kitchen->openTicketFor($order);
        } catch (\Throwable $e) {
            report($e);

            try {
                OpenKitchenTicket::dispatch($order->getKey());
            } catch (\Throwable $dispatchError) {
                report($dispatchError);
            }
        }
    }

    /**
     * Reject a pending order, reversing the stock it reserved.
     */
    public function reject(Order $order, User $user, ?string $reason = null): Order
    {
        if ($order->acceptance_status !== AcceptanceStatus::Pending) {
            throw ValidationException::withMessages([
                'order' => 'Only an order awaiting confirmation can be rejected.',
            ]);
        }

        DB::transaction(function () use ($order, $user, $reason) {
            $branch = $order->branch;

            $this->reverseStock($order, $branch, 'Rejected '.$order->order_number);

            $order->forceFill([
                'acceptance_status' => AcceptanceStatus::Rejected,
                'rejected_at' => now(),
                'rejected_reason' => $reason,
                'rejected_by_user_id' => $user->getKey(),
                'status' => OrderStatus::Voided,
                'voided_at' => now(),
            ])->save();

            $order->statusHistory()->create([
                'tenant_id' => $order->tenant_id,
                'status' => OrderStatus::Voided,
                'user_id' => $user->getKey(),
                'note' => 'Order rejected'.($reason ? ': '.$reason : ''),
            ]);

            $this->audit->log('order.rejected', $order, [
                'order_number' => $order->order_number,
                'reason' => $reason,
            ], $user, $order->tenant_id);
        });

        $this->tables->refreshForOrder($order);

        app(RealtimeBroadcaster::class)->send(new OrderActivity($order, 'rejected'));
        app(QrRealtime::class)->notifyOrder($order, 'rejected');

        return $order->fresh();
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

        // Serving feeds the Bill/Invoice workflow (idempotent, best-effort).
        if ($status === FulfillmentStatus::Served) {
            try {
                app(\App\Domain\Invoicing\OrderInvoiceService::class)->forServedOrder($order);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        app(RealtimeBroadcaster::class)->send(new OrderActivity($order, $status->value));
        app(QrRealtime::class)->notifyOrder($order, $status->value);

        return $order;
    }
}
