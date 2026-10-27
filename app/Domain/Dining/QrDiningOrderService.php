<?php

namespace App\Domain\Dining;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Notifications\NotificationService;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\POS\SaleService;
use App\Domain\Realtime\Events\OrderAwaitingApproval;
use App\Domain\Realtime\RealtimeBroadcaster;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Places a customer order into a dining session using the existing POS engine
 * (server-authoritative pricing, stock, numbering and kitchen routing).
 */
class QrDiningOrderService
{
    public function __construct(
        protected SaleService $sales,
        protected DiningSessionService $sessions,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function place(DiningSession $session, DiningParticipant $participant, array $data): Order
    {
        if (! $session->isActive()) {
            throw ValidationException::withMessages(['session' => 'This dining session is no longer open.']);
        }

        if ($session->isExpired()) {
            $this->sessions->expire($session);

            throw ValidationException::withMessages(['session' => 'This dining session has expired.']);
        }

        $branch = Branch::query()->findOrFail($session->branch_id);

        $data['idempotency_key'] = $data['idempotency_key'] ?? 'qr-'.$session->getKey().'-'.Str::uuid();

        $order = $this->sales->openQrOrder($session, $participant, $data, $branch);

        $this->sessions->touch($session);
        $this->sessions->record($session, 'order.placed', 'participant', [
            'order_id' => $order->getKey(),
            'order_number' => $order->order_number,
        ], $participant->getKey());

        // Alert staff when the order is waiting for confirmation.
        if ($order->acceptance_status === AcceptanceStatus::Pending) {
            try {
                app(NotificationService::class)->newQrOrder($order);
            } catch (\Throwable $e) {
                report($e);
            }

            // The same moment, pushed live so the badge, toast and chime are instant.
            app(RealtimeBroadcaster::class)->send(new OrderAwaitingApproval($order));
        }

        return $order->fresh(['items.modifiers']);
    }
}
