<?php

namespace App\Domain\Orders;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Invoicing\OrderInvoiceService;
use App\Domain\Kitchen\Enums\KitchenItemStatus;
use App\Domain\Kitchen\KitchenService;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderRound;
use App\Domain\POS\SaleCalculator;
use App\Domain\POS\SaleService;
use App\Domain\Realtime\Events\OrderActivity;
use App\Domain\Realtime\QrRealtime;
use App\Domain\Realtime\RealtimeBroadcaster;
use App\Domain\Tables\TableService;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Appends item rounds to an existing order, and manages the round lifecycle
 * (accept/reject/cancel). The order remains one bill and one kitchen-bound
 * submission per round.
 */
class OrderRoundService
{
    public function __construct(
        protected SaleService $sales,
        protected SaleCalculator $calculator,
        protected OrderTotalsService $totals,
        protected OrderConfirmationSettings $confirmation,
        protected ActiveOrderResolver $resolver,
        protected KitchenService $kitchen,
        protected OrderInvoiceService $invoices,
        protected OrderService $orders,
        protected TableService $tables,
        protected AuditLogger $audit,
    ) {}

    /**
     * Append a new round of items to an order.
     *
     * Options: source (OrderSource), user (?User), participant (?DiningParticipant),
     * idempotency_key (?string), accept (bool, default true), note (?string).
     *
     * @param  list<array<string, mixed>>  $items
     * @param  array<string, mixed>  $options
     */
    public function append(Order $order, array $items, array $options = []): OrderRound
    {
        $this->assertCanAppend($order);

        $accept = (bool) ($options['accept'] ?? true);

        $round = DB::transaction(function () use ($order, $items, $options, $accept): OrderRound {
            $locked = Order::query()->whereKey($order->getKey())->lockForUpdate()->firstOrFail();

            if (! $this->resolver->isEligible($locked)) {
                throw ValidationException::withMessages([
                    'order' => 'This order can no longer accept additional items.',
                ]);
            }

            $this->invoices->assertEditableForOrder($locked);

            $key = $options['idempotency_key'] ?? null;

            if ($key) {
                $existing = OrderRound::query()->where('idempotency_key', $key)->first();

                if ($existing) {
                    if ((int) $existing->order_id !== (int) $locked->getKey()) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => 'This request was already used on another order.',
                        ]);
                    }

                    return $existing->load('items.modifiers');
                }
            }

            $branch = Branch::query()->findOrFail($locked->branch_id);
            $lines = $this->sales->resolveLines($items, $branch);
            $computed = $this->calculator->calculate($lines, $locked->order_type, $this->roundPricing($locked));

            $roundNo = (int) $locked->rounds()->max('round_no') + 1;
            $source = $options['source'] ?? OrderSource::Pos;
            $sourceValue = $source instanceof OrderSource ? $source->value : (string) $source;

            $round = $locked->rounds()->create([
                'tenant_id' => $locked->tenant_id,
                'branch_id' => $locked->branch_id,
                'round_no' => $roundNo,
                'source' => $sourceValue,
                'dining_participant_id' => ($options['participant'] ?? null)?->getKey() ?? $locked->dining_participant_id,
                'requested_by_user_id' => ($options['user'] ?? null)?->getKey(),
                'idempotency_key' => $key,
                'status' => OrderRound::STATUS_ACTIVE,
                'acceptance_status' => $accept ? AcceptanceStatus::AutoAccepted->value : AcceptanceStatus::Pending->value,
                'accepted_at' => $accept ? now() : null,
                'accepted_by_user_id' => $accept ? ($options['user'] ?? null)?->getKey() : null,
                'subtotal' => $computed['subtotal'],
                'discount_total' => $computed['discount_total'],
                'tax_total' => $computed['tax_total'],
                'service_charge' => $computed['service_charge'],
                'total' => $computed['total'],
            ]);

            $this->createItems($locked, $round, $computed['items']);

            $this->sales->deductStockFor($locked, $branch, $round->items()->get());
            $this->totals->recalculate($locked);

            $locked->statusHistory()->create([
                'tenant_id' => $locked->tenant_id,
                'status' => $locked->status,
                'user_id' => ($options['user'] ?? null)?->getKey(),
                'note' => 'Additional items added (round '.$roundNo.')',
            ]);

            $this->audit->log('order.round_appended', $locked, [
                'order_number' => $locked->order_number,
                'round_no' => $roundNo,
                'items' => count($items),
                'total' => (float) $locked->total,
            ], $options['user'] ?? null, $locked->tenant_id);

            return $round->load('items.modifiers');
        });

        // An idempotent replay returns the round without repeating side effects.
        if (! $round->wasRecentlyCreated) {
            return $round;
        }

        if ($accept) {
            $this->dispatchRound($round);
        }

        $fresh = $order->fresh();

        try {
            $this->invoices->refreshForOrder($fresh);
        } catch (\Throwable $e) {
            report($e);
        }

        $this->tables->refreshForOrder($fresh);

        try {
            app(RealtimeBroadcaster::class)->send(new OrderActivity($fresh, 'updated'));
            app(QrRealtime::class)->notifyOrder($fresh, 'updated');
        } catch (\Throwable $e) {
            report($e);
        }

        return $round;
    }

    public function assertCanAppend(Order $order): void
    {
        if (! $this->confirmation->allowAdditionalItems()) {
            throw ValidationException::withMessages([
                'items' => 'Additional items are disabled for this restaurant.',
            ]);
        }

        if (! $this->resolver->isEligible($order)) {
            throw ValidationException::withMessages([
                'order' => 'This order can no longer accept additional items.',
            ]);
        }

        $this->invoices->assertEditableForOrder($order);
    }

    /**
     * Accept a pending round and send only its own items to the kitchen.
     */
    public function accept(OrderRound $round, User $user): OrderRound
    {
        if (! $round->isActive()) {
            throw ValidationException::withMessages(['round' => 'This round is no longer active.']);
        }

        if ($round->acceptance_status !== AcceptanceStatus::Pending) {
            throw ValidationException::withMessages(['round' => 'This round is no longer awaiting confirmation.']);
        }

        $round->forceFill([
            'acceptance_status' => AcceptanceStatus::Accepted,
            'accepted_at' => now(),
            'accepted_by_user_id' => $user->getKey(),
        ])->save();

        $order = $round->order()->firstOrFail();

        $order->statusHistory()->create([
            'tenant_id' => $order->tenant_id,
            'status' => $order->status,
            'user_id' => $user->getKey(),
            'note' => 'Additional items confirmed (round '.$round->round_no.')',
        ]);

        $this->audit->log('order.round_accepted', $order, [
            'round_no' => $round->round_no,
        ], $user, $order->tenant_id);

        $this->dispatchRound($round);

        return $round->fresh('items.modifiers');
    }

    /**
     * Reject a pending round: its stock is returned, its items stop counting
     * toward the bill, and the rest of the order is untouched.
     */
    public function reject(OrderRound $round, User $user, ?string $reason = null): OrderRound
    {
        return $this->cancelInternal($round, $user, $reason, true);
    }

    /**
     * Cancel an active round (for example the kitchen cannot make it anymore).
     */
    public function cancel(OrderRound $round, User $user, ?string $reason = null): OrderRound
    {
        return $this->cancelInternal($round, $user, $reason, false);
    }

    protected function cancelInternal(OrderRound $round, User $user, ?string $reason, bool $rejected): OrderRound
    {
        if (! $round->isActive()) {
            throw ValidationException::withMessages(['round' => 'This round is no longer active.']);
        }

        $ticket = $round->kitchenTicket;

        if ($ticket && $ticket->items()->where('status', KitchenItemStatus::Served->value)->exists()) {
            throw ValidationException::withMessages([
                'round' => 'Items from this round have already been served and cannot be cancelled.',
            ]);
        }

        DB::transaction(function () use ($round, $user, $reason, $rejected): void {
            $order = $round->order()->firstOrFail();
            $branch = Branch::query()->findOrFail($round->branch_id);

            $this->orders->reverseStockFor(
                $order,
                $branch,
                $round->items()->get(),
                ($rejected ? 'Rejected' : 'Cancelled').' '.$order->order_number.' round '.$round->round_no,
            );

            $round->forceFill([
                'status' => OrderRound::STATUS_CANCELLED,
                'acceptance_status' => $rejected
                    ? AcceptanceStatus::Rejected->value
                    : $round->acceptance_status->value,
                'rejected_at' => now(),
                'rejected_by_user_id' => $user->getKey(),
                'rejected_reason' => $reason,
            ])->save();

            $this->totals->recalculate($order);

            $order->statusHistory()->create([
                'tenant_id' => $order->tenant_id,
                'status' => $order->status,
                'user_id' => $user->getKey(),
                'note' => ($rejected ? 'Additional items rejected' : 'Additional items cancelled')
                    .' (round '.$round->round_no.')'.($reason ? ': '.$reason : ''),
            ]);

            $this->audit->log($rejected ? 'order.round_rejected' : 'order.round_cancelled', $order, [
                'round_no' => $round->round_no,
                'reason' => $reason,
            ], $user, $order->tenant_id);
        });

        if ($ticket && ! $ticket->status->isTerminal()) {
            try {
                $this->kitchen->cancelForRound($round);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $order = $round->order()->firstOrFail();

        try {
            $this->invoices->refreshForOrder($order->fresh());
        } catch (\Throwable $e) {
            report($e);
        }

        $this->tables->refreshForOrder($order);

        return $round->fresh('items.modifiers');
    }

    /**
     * @return array{discount_type: string, discount_value: float, service_charge: bool}
     */
    protected function roundPricing(Order $order): array
    {
        return [
            // A fixed order discount already applies to round 1; applying it
            // again to every round would multiply it.
            'discount_type' => $order->discount_type === 'percent' ? 'percent' : 'none',
            'discount_value' => (float) $order->discount_value,
            'service_charge' => (bool) $order->service_charge_applied,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    protected function createItems(Order $order, OrderRound $round, array $items): void
    {
        foreach ($items as $item) {
            $orderItem = $order->items()->create([
                'tenant_id' => $order->tenant_id,
                'order_round_id' => $round->getKey(),
                'product_id' => $item['product']->getKey(),
                'product_variant_id' => $item['variant']?->getKey(),
                'name' => $item['name'],
                'sku' => $item['sku'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'unit_cost' => $item['unit_cost'],
                'discount_amount' => $item['discount_amount'],
                'modifiers_total' => $item['modifiers_total'] ?? 0,
                'tax_rate' => $item['tax_rate'],
                'tax_amount' => $item['tax_amount'],
                'line_total' => $item['line_total'],
                'notes' => $item['notes'],
            ]);

            foreach ($item['modifiers'] ?? [] as $modifier) {
                $orderItem->modifiers()->create([
                    'tenant_id' => $order->tenant_id,
                    'modifier_option_id' => $modifier['option_id'],
                    'group_name' => $modifier['group_name'],
                    'name' => $modifier['name'],
                    'price_delta' => $modifier['price_delta'],
                    'quantity' => $modifier['quantity'],
                ]);
            }
        }
    }

    protected function dispatchRound(OrderRound $round): void
    {
        if (! $this->confirmation->sendConfirmedToKitchen()) {
            return;
        }

        try {
            $this->kitchen->openTicketForRound($round);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
