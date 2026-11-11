<?php

namespace App\Domain\Dining;

use App\Domain\Branches\Models\Branch;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Dining\Enums\DiningSessionStatus;
use App\Domain\Notifications\NotificationService;
use App\Domain\Orders\ActiveOrderResolver;
use App\Domain\Orders\Enums\AcceptanceStatus;
use App\Domain\Orders\Enums\OrderSource;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\OrderConfirmationSettings;
use App\Domain\Orders\OrderRoundService;
use App\Domain\POS\SaleService;
use App\Domain\Realtime\Events\OrderAwaitingApproval;
use App\Domain\Realtime\RealtimeBroadcaster;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Places a customer order into a dining session using the existing POS engine
 * (server-authoritative pricing, stock, numbering and kitchen routing).
 *
 * When the tenant allows additional items, a repeat submission joins the
 * table's eligible active order as a new round instead of opening a new order.
 */
class QrDiningOrderService
{
    public function __construct(
        protected SaleService $sales,
        protected DiningSessionService $sessions,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{order: Order, round: ?\App\Domain\Orders\Models\OrderRound, merged: bool}
     */
    public function place(DiningSession $session, DiningParticipant $participant, array $data): array
    {
        if (! $session->isActive()) {
            throw ValidationException::withMessages(['session' => 'This dining session is no longer open.']);
        }

        if ($session->status === DiningSessionStatus::Settling) {
            throw ValidationException::withMessages(['session' => 'The bill is being settled; no more items can be added.']);
        }

        if ($session->isExpired()) {
            $this->sessions->expire($session);

            throw ValidationException::withMessages(['session' => 'This dining session has expired.']);
        }

        $branch = Branch::query()->findOrFail($session->branch_id);

        $data['idempotency_key'] = $data['idempotency_key'] ?? 'qr-'.$session->getKey().'-'.Str::uuid();

        $settings = app(QrDiningSettings::class);
        $autoAccept = $settings->autoAccept();
        $allowMerge = app(OrderConfirmationSettings::class)->allowAdditionalItems()
            && $settings->allowAdditionalOrders();

        if ($allowMerge) {
            $existing = app(ActiveOrderResolver::class)->forQrSession($session, $participant);

            if ($existing) {
                $round = app(OrderRoundService::class)->append($existing, $data['items'] ?? [], [
                    'source' => OrderSource::Qr,
                    'participant' => $participant,
                    'idempotency_key' => $data['idempotency_key'],
                    'accept' => $autoAccept,
                ]);

                $order = $existing->fresh(['items.modifiers']);

                $this->sessions->touch($session);
                $this->sessions->record($session, 'order.round_appended', 'participant', [
                    'order_id' => $order->getKey(),
                    'order_number' => $order->order_number,
                    'round_no' => $round->round_no,
                ], $participant->getKey());

                if (! $autoAccept && $round->acceptance_status === AcceptanceStatus::Pending) {
                    $this->notifyAwaitingApproval($order);
                }

                return ['order' => $order, 'round' => $round, 'merged' => true];
            }
        }

        $order = $this->sales->openQrOrder($session, $participant, $data, $branch);

        $this->sessions->touch($session);
        $this->sessions->record($session, 'order.placed', 'participant', [
            'order_id' => $order->getKey(),
            'order_number' => $order->order_number,
        ], $participant->getKey());

        // Alert staff when the order is waiting for confirmation.
        if ($order->acceptance_status === AcceptanceStatus::Pending) {
            $this->notifyAwaitingApproval($order);
        }

        return ['order' => $order->fresh(['items.modifiers']), 'round' => null, 'merged' => false];
    }

    protected function notifyAwaitingApproval(Order $order): void
    {
        try {
            app(NotificationService::class)->newQrOrder($order);
        } catch (\Throwable $e) {
            report($e);
        }

        // The same moment, pushed live so the badge, toast and chime are instant.
        app(RealtimeBroadcaster::class)->send(new OrderAwaitingApproval($order));
    }
}
