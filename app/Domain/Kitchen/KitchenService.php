<?php

namespace App\Domain\Kitchen;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Kitchen\Enums\KitchenItemStatus;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Kitchen\Models\KitchenTicketItem;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderRound;
use App\Domain\Realtime\Events\KitchenTicketActivity;
use App\Domain\Realtime\RealtimeBroadcaster;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Kitchen Display System: turns a committed order into a kitchen ticket, routes
 * items to stations, and moves tickets/items through their statuses.
 *
 * Ticket creation is triggered after the sale transaction commits; it is
 * idempotent per order, so a retry never creates a duplicate ticket.
 */
class KitchenService
{
    public function __construct(
        protected AuditLogger $audit,
        protected TenantContext $context,
        protected KitchenStatusSynchronizer $sync,
    ) {}

    public function enabled(): bool
    {
        return (bool) ($this->context->tenant()?->getSetting('kitchen.enabled', true) ?? true);
    }

    public function openTicketFor(Order $order): ?KitchenTicket
    {
        if (! $this->enabled()) {
            return null;
        }

        if ($existing = $order->kitchenTicket()->with('items')->first()) {
            return $existing;
        }

        $round = $order->rounds()->orderBy('round_no')->first();

        // Legacy orders (created before rounds existed) keep the old whole-order
        // snapshot behaviour.
        if (! $round) {
            return $this->openLegacyTicket($order);
        }

        if (! $round->isActive()) {
            return null;
        }

        return $this->openTicketForRound($round);
    }

    /**
     * Open the kitchen ticket for one round. Only that round's items are
     * copied, which is what keeps previously sent food off the pass.
     */
    public function openTicketForRound(OrderRound $round): ?KitchenTicket
    {
        if (! $this->enabled()) {
            return null;
        }

        if ($round->kitchen_ticket_id) {
            return KitchenTicket::query()->with('items')->find($round->kitchen_ticket_id);
        }

        $order = $round->order()->first();

        if (! $order || $round->items()->count() === 0 || ! $round->isActive()) {
            return null;
        }

        try {
            $ticket = DB::transaction(function () use ($round, $order) {
                // Serialize concurrent dispatch for this round, then re-check.
                $locked = OrderRound::query()->whereKey($round->getKey())->lockForUpdate()->first();

                if (! $locked || ! $locked->isActive()) {
                    return null;
                }

                if ($locked->kitchen_ticket_id) {
                    return KitchenTicket::query()->with('items')->find($locked->kitchen_ticket_id);
                }

                $ticket = KitchenTicket::create([
                    'tenant_id' => $order->tenant_id,
                    'branch_id' => $order->branch_id,
                    'order_id' => $order->getKey(),
                    'order_round_id' => $locked->getKey(),
                    'round_no' => $locked->round_no,
                    'status' => KitchenTicketStatus::New,
                    'priority' => 'normal',
                    'notes' => $order->notes,
                ]);

                foreach ($locked->items()->with(['product', 'modifiers'])->get() as $item) {
                    $modifiers = $item->modifiers->map(fn ($modifier) => [
                        'name' => $modifier->name,
                        'group_name' => $modifier->group_name,
                        'price_delta' => (float) $modifier->price_delta,
                        'quantity' => (float) $modifier->quantity,
                    ])->all();

                    $ticket->items()->create([
                        'tenant_id' => $order->tenant_id,
                        'order_item_id' => $item->getKey(),
                        'station_id' => $item->product?->kitchen_station_id,
                        'name' => $item->name,
                        'quantity' => $item->quantity,
                        'status' => KitchenItemStatus::Pending,
                        'notes' => $item->notes,
                        'modifiers' => $modifiers ?: null,
                    ]);
                }

                $locked->forceFill([
                    'kitchen_ticket_id' => $ticket->getKey(),
                    'sent_to_kitchen_at' => now(),
                ])->save();

                $this->audit->log('kitchen.ticket_opened', $ticket, [
                    'order_number' => $order->order_number,
                    'round_no' => $locked->round_no,
                ]);

                return $ticket->load('items');
            });
        } catch (QueryException $e) {
            // A concurrent creation won the unique(order_id, round_no) race.
            return $round->fresh()?->kitchenTicket;
        }

        if (! $ticket) {
            return null;
        }

        // A ticket really was created — tell the kitchen board and the order list.
        app(RealtimeBroadcaster::class)->send(new KitchenTicketActivity($ticket, KitchenTicketStatus::New->value));

        return $ticket;
    }

    /**
     * Whole-order snapshot for orders that predate the round model.
     */
    protected function openLegacyTicket(Order $order): ?KitchenTicket
    {
        if ($order->items()->count() === 0) {
            return null;
        }

        try {
            $ticket = DB::transaction(function () use ($order) {
                // Serialize concurrent creation for this order, then re-check.
                $locked = Order::query()->whereKey($order->getKey())->lockForUpdate()->first();

                if ($locked && ($existing = $locked->kitchenTicket()->with('items')->first())) {
                    return $existing;
                }

                $ticket = KitchenTicket::create([
                    'tenant_id' => $order->tenant_id,
                    'branch_id' => $order->branch_id,
                    'order_id' => $order->getKey(),
                    'round_no' => 1,
                    'status' => KitchenTicketStatus::New,
                    'priority' => 'normal',
                    'notes' => $order->notes,
                ]);

                foreach ($order->items()->with(['product', 'modifiers'])->get() as $item) {
                    $modifiers = $item->modifiers->map(fn ($modifier) => [
                        'name' => $modifier->name,
                        'group_name' => $modifier->group_name,
                        'price_delta' => (float) $modifier->price_delta,
                        'quantity' => (float) $modifier->quantity,
                    ])->all();

                    $ticket->items()->create([
                        'tenant_id' => $order->tenant_id,
                        'order_item_id' => $item->getKey(),
                        'station_id' => $item->product?->kitchen_station_id,
                        'name' => $item->name,
                        'quantity' => $item->quantity,
                        'status' => KitchenItemStatus::Pending,
                        'notes' => $item->notes,
                        'modifiers' => $modifiers ?: null,
                    ]);
                }

                $this->audit->log('kitchen.ticket_opened', $ticket, [
                    'order_number' => $order->order_number,
                ]);

                return $ticket->load('items');
            });
        } catch (QueryException $e) {
            // A concurrent creation won the unique(order_id, round_no) race.
            return $order->kitchenTicket()->with('items')->first();
        }

        app(RealtimeBroadcaster::class)->send(new KitchenTicketActivity($ticket, KitchenTicketStatus::New->value));

        return $ticket;
    }

    public function setTicketStatus(KitchenTicket $ticket, KitchenTicketStatus $status): KitchenTicket
    {
        if ($ticket->status === $status) {
            return $ticket->fresh('items');
        }

        if (! $ticket->status->canTransitionTo($status)) {
            throw ValidationException::withMessages([
                'status' => "Cannot move a ticket from \"{$ticket->status->label()}\" to \"{$status->label()}\".",
            ]);
        }

        $previous = $ticket->status;
        $ticket->status = $status;

        match ($status) {
            KitchenTicketStatus::Accepted, KitchenTicketStatus::Preparing => $ticket->accepted_at ??= now(),
            KitchenTicketStatus::Ready => $ticket->ready_at ??= now(),
            KitchenTicketStatus::HandedOver => $ticket->handed_over_at ??= now(),
            KitchenTicketStatus::Served => $ticket->served_at ??= now(),
            KitchenTicketStatus::Cancelled => $ticket->cancelled_at ??= now(),
            default => null,
        };

        $ticket->save();

        if ($status === KitchenTicketStatus::Ready) {
            $ticket->items()->whereIn('status', [KitchenItemStatus::Pending->value, KitchenItemStatus::Preparing->value])
                ->update(['status' => KitchenItemStatus::Ready->value]);
        } elseif ($status === KitchenTicketStatus::Served) {
            $ticket->items()->where('status', '!=', KitchenItemStatus::Served->value)
                ->update(['status' => KitchenItemStatus::Served->value]);
        } elseif ($status === KitchenTicketStatus::Cancelled) {
            $ticket->items()->where('status', '!=', KitchenItemStatus::Served->value)
                ->update(['status' => KitchenItemStatus::Cancelled->value]);
        }

        $this->audit->log('kitchen.ticket_status', $ticket, [
            'from' => $previous->value,
            'status' => $status->value,
        ]);

        $this->sync->sync($ticket);
        $this->notifyStaff($ticket, $status);

        // Push the new status to the kitchen board and any open order list.
        app(RealtimeBroadcaster::class)->send(new KitchenTicketActivity($ticket, $status->value));

        return $ticket->fresh('items');
    }

    /**
     * Notify the order's assigned staff when the kitchen marks it ready / hands
     * it over. Best-effort — never break the kitchen update.
     */
    protected function notifyStaff(KitchenTicket $ticket, KitchenTicketStatus $status): void
    {
        if (! in_array($status, [KitchenTicketStatus::Ready, KitchenTicketStatus::HandedOver], true)) {
            return;
        }

        $order = $ticket->order()->first();

        if (! $order) {
            return;
        }

        try {
            $notifier = app(\App\Domain\Notifications\NotificationService::class);

            match ($status) {
                KitchenTicketStatus::Ready => $notifier->orderReady($order),
                KitchenTicketStatus::HandedOver => $notifier->orderHandedOver($order),
                default => null,
            };
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public function setItemStatus(KitchenTicketItem $item, KitchenItemStatus $status): KitchenTicketItem
    {
        $item->status = $status;
        $item->save();

        $this->syncTicketFromItems($item->ticket);

        return $item->fresh();
    }

    public function setPriority(KitchenTicket $ticket, string $priority): KitchenTicket
    {
        $ticket->forceFill(['priority' => $priority])->save();

        return $ticket;
    }

    public function markPrinted(KitchenTicket $ticket): void
    {
        $ticket->forceFill(['printed_at' => now()])->save();
    }

    public function cancelForRound(OrderRound $round): void
    {
        $ticket = $round->kitchenTicket()->first();

        if (! $ticket || $ticket->status->isTerminal()) {
            return;
        }

        DB::transaction(function () use ($ticket): void {
            $ticket->forceFill([
                'status' => KitchenTicketStatus::Cancelled,
                'cancelled_at' => $ticket->cancelled_at ?? now(),
                'notes' => trim(($ticket->notes ?? '').' [round cancelled]'),
            ])->save();

            $ticket->items()->where('status', '!=', KitchenItemStatus::Served->value)
                ->update(['status' => KitchenItemStatus::Cancelled->value]);
        });

        $this->sync->sync($ticket->fresh());
    }

    public function cancelForOrder(Order $order): void
    {
        $tickets = $order->kitchenTickets()
            ->whereNotIn('status', [
                KitchenTicketStatus::Served->value,
                KitchenTicketStatus::Cancelled->value,
            ])
            ->get();

        if ($tickets->isEmpty()) {
            return;
        }

        foreach ($tickets as $ticket) {
            DB::transaction(function () use ($ticket): void {
                $ticket->forceFill([
                    'status' => KitchenTicketStatus::Cancelled,
                    'cancelled_at' => $ticket->cancelled_at ?? now(),
                    'notes' => trim(($ticket->notes ?? '').' [order voided]'),
                ])->save();

                $ticket->items()->where('status', '!=', KitchenItemStatus::Served->value)
                    ->update(['status' => KitchenItemStatus::Cancelled->value]);
            });

            $this->sync->sync($ticket->fresh());
        }
    }

    protected function syncTicketFromItems(KitchenTicket $ticket): void
    {
        // Never reopen a terminal ticket from item edits.
        if ($ticket->status->isTerminal()) {
            return;
        }

        // pluck returns cast enum instances for cast columns.
        $statuses = $ticket->items()->pluck('status');

        if ($statuses->isEmpty()) {
            return;
        }

        if ($statuses->every(fn ($s) => $s === KitchenItemStatus::Served)) {
            $ticket->forceFill(['status' => KitchenTicketStatus::Served, 'served_at' => $ticket->served_at ?? now()])->save();
        } elseif ($statuses->every(fn ($s) => in_array($s, [KitchenItemStatus::Ready, KitchenItemStatus::Served], true))) {
            $ticket->forceFill(['status' => KitchenTicketStatus::Ready, 'ready_at' => $ticket->ready_at ?? now()])->save();
        } elseif ($statuses->contains(KitchenItemStatus::Preparing)) {
            $ticket->forceFill(['status' => KitchenTicketStatus::Preparing, 'accepted_at' => $ticket->accepted_at ?? now()])->save();
        }

        $this->sync->sync($ticket);
    }
}
