<?php

namespace App\Domain\Kitchen;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Kitchen\Enums\KitchenTicketStatus;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Orders\Enums\FulfillmentStatus;

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

        $target = self::fulfillmentFor($ticket->status);

        if ($target === null || $order->fulfillment_status === $target) {
            return;
        }

        // Never force an illegal fulfillment jump (e.g. Served → Preparing);
        // the order keeps its own guard, the kitchen stays authoritative.
        if (! $order->fulfillment_status->canTransitionTo($target)) {
            return;
        }

        $order->forceFill(['fulfillment_status' => $target])->save();

        $order->statusHistory()->create([
            'tenant_id' => $order->tenant_id,
            'status' => $order->status,
            'user_id' => null,
            'note' => 'Kitchen: '.$ticket->status->label(),
        ]);

        $this->audit->log('order.fulfillment_synced', $order, [
            'kitchen_status' => $ticket->status->value,
            'fulfillment_status' => $target->value,
        ], null, $order->tenant_id);

        // Serving is the trigger for the Bill/Invoice workflow. Idempotent and
        // best-effort: a failure here must never break the kitchen update.
        if ($target === FulfillmentStatus::Served) {
            try {
                app(\App\Domain\Invoicing\OrderInvoiceService::class)->forServedOrder($order);
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}
