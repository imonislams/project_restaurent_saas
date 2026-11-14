<?php

namespace App\Domain\Kitchen;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Invoicing\OrderInvoiceService;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Orders\Enums\FulfillmentStatus;
use App\Domain\Orders\Models\Order;

/**
 * Keeps the Order System's fulfillment state aligned with the Kitchen, which is
 * the authoritative source for kitchen processing status. The Order System and
 * customer QR tracking only ever read this mapped value.
 */
class KitchenStatusSynchronizer
{
    public function __construct(protected AuditLogger $audit) {}

    /**
     * Map a kitchen status onto the order's fulfillment status.
     */
    public static function fulfillmentFor(KitchenTicketStatus $status): ?FulfillmentStatus
    {
        return match ($status) {
            KitchenTicketStatus::New, KitchenTicketStatus::Accepted => FulfillmentStatus::New,
            KitchenTicketStatus::Preparing => FulfillmentStatus::Preparing,
            KitchenTicketStatus::Ready, KitchenTicketStatus::HandedOver => FulfillmentStatus::Ready,
            KitchenTicketStatus::Served => FulfillmentStatus::Served,
            KitchenTicketStatus::Cancelled => FulfillmentStatus::Cancelled,
        };
    }

    public function sync(KitchenTicket $ticket): void
    {
        $order = $ticket->order()->first();

        if (! $order) {
            return;
        }

        $target = $this->aggregateFor($order, $ticket);

        if ($target === null || $order->fulfillment_status === $target) {
            return;
        }

        // The kitchen is authoritative and orders may legitimately move
        // backwards when a new round of food is added after the first was
        // served, so the order-level transition guard does not apply here.
        $order->forceFill(['fulfillment_status' => $target])->save();

        $order->statusHistory()->create([
            'tenant_id' => $order->tenant_id,
            'status' => $order->status,
            'user_id' => null,
            'note' => 'Kitchen: '.$ticket->status->label()
                .($ticket->round_no > 1 ? ' (round '.$ticket->round_no.')' : ''),
        ]);

        $this->audit->log('order.fulfillment_synced', $order, [
            'kitchen_status' => $ticket->status->value,
            'round_no' => $ticket->round_no,
            'fulfillment_status' => $target->value,
        ], null, $order->tenant_id);

        // Serving is the trigger for the Bill/Invoice workflow. With rounds,
        // the bill is only complete once every non-cancelled round is served.
        if ($target === FulfillmentStatus::Served && $this->allRoundsServed($order)) {
            try {
                app(OrderInvoiceService::class)->forServedOrder($order);
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }

    /**
     * The order tracks its least-advanced round, so a newly added round puts
     * the order back into the kitchen queue.
     */
    protected function aggregateFor(Order $order, KitchenTicket $ticket): ?FulfillmentStatus
    {
        $tickets = $order->kitchenTickets()
            ->where('status', '!=', KitchenTicketStatus::Cancelled->value)
            ->get();

        if ($tickets->isEmpty()) {
            return self::fulfillmentFor($ticket->status);
        }

        $rank = fn (KitchenTicketStatus $status): int => match ($status) {
            KitchenTicketStatus::New, KitchenTicketStatus::Accepted => 0,
            KitchenTicketStatus::Preparing => 1,
            KitchenTicketStatus::Ready, KitchenTicketStatus::HandedOver => 2,
            KitchenTicketStatus::Served => 3,
            KitchenTicketStatus::Cancelled => 4,
        };

        $least = $tickets->sortBy(fn (KitchenTicket $row) => $rank($row->status))->first();

        return self::fulfillmentFor($least->status);
    }

    protected function allRoundsServed(Order $order): bool
    {
        return $order->kitchenTickets()
            ->where('status', '!=', KitchenTicketStatus::Cancelled->value)
            ->where('status', '!=', KitchenTicketStatus::Served->value)
            ->doesntExist();
    }
}
