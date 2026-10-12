<?php

namespace App\Domain\Kitchen;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Kitchen\Enums\KitchenItemStatus;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Kitchen\Models\KitchenTicketItem;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

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

        if ($order->kitchenTicket()->exists()) {
            return $order->kitchenTicket()->with('items')->first();
        }

        if ($order->items()->count() === 0) {
            return null;
        }

        return DB::transaction(function () use ($order) {
            $ticket = KitchenTicket::create([
                'tenant_id' => $order->tenant_id,
                'branch_id' => $order->branch_id,
                'order_id' => $order->getKey(),
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
    }

    public function setTicketStatus(KitchenTicket $ticket, KitchenTicketStatus $status): KitchenTicket
    {
        $ticket->status = $status;

        match ($status) {
            KitchenTicketStatus::Accepted, KitchenTicketStatus::Preparing => $ticket->accepted_at ??= now(),
            KitchenTicketStatus::Ready => $ticket->ready_at ??= now(),
            KitchenTicketStatus::Served => $ticket->served_at ??= now(),
            default => null,
        };

        $ticket->save();

        if ($status === KitchenTicketStatus::Ready) {
            $ticket->items()->whereIn('status', [KitchenItemStatus::Pending->value, KitchenItemStatus::Preparing->value])
                ->update(['status' => KitchenItemStatus::Ready->value]);
        } elseif ($status === KitchenTicketStatus::Served) {
            $ticket->items()->where('status', '!=', KitchenItemStatus::Served->value)
                ->update(['status' => KitchenItemStatus::Served->value]);
        }

        $this->audit->log('kitchen.ticket_status', $ticket, ['status' => $status->value]);

        return $ticket->fresh('items');
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

    public function cancelForOrder(Order $order): void
    {
        if ($ticket = $order->kitchenTicket) {
            $ticket->forceFill(['status' => KitchenTicketStatus::Served, 'notes' => trim(($ticket->notes ?? '').' [order voided]')])->save();
        }
    }

    protected function syncTicketFromItems(KitchenTicket $ticket): void
    {
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
    }
}
