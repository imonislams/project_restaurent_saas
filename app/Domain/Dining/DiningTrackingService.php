<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;

/**
 * Builds the customer tracking payload (orders, statuses, bill and totals) that
 * is polled by the tracking screen. Everything is authorized per participant.
 */
class DiningTrackingService
{
    public function __construct(
        protected CustomerStatusMapper $status,
        protected DiningAuthorization $auth,
        protected QrDiningSettings $settings,
        protected QrPaymentService $payments,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function payload(DiningSession $session, ?DiningParticipant $participant): array
    {
        $orders = $this->auth
            ->ordersQuery($session, $participant)
            ->with(['items.modifiers', 'kitchenTicket'])
            ->latest('id')
            ->get();

        $outstanding = 0.0;
        $paid = 0.0;

        $mapped = $orders->map(function ($order) use (&$outstanding, &$paid) {
            if ($order->status->value !== 'voided') {
                $outstanding += (float) $order->total - (float) $order->paid_total;
                $paid += (float) $order->paid_total;
            }

            return [
                'id' => $order->getKey(),
                'number' => $order->order_number,
                'status' => $this->status->map($order),
                'acceptance_status' => $order->acceptance_status->value,
                'status_value' => $order->status->value,
                'total' => (float) $order->total,
                'paid_total' => (float) $order->paid_total,
                'currency' => $order->currency,
                'placed_at' => $order->placed_at?->toIso8601String(),
                'updated_at' => $order->updated_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name,
                    'quantity' => (float) $item->quantity,
                    'line_total' => (float) $item->line_total,
                    'modifiers' => $item->modifiers->map(fn ($m) => $m->name)->all(),
                ]),
            ];
        });

        $lastUpdated = $orders->max(fn ($order) => $order->updated_at?->getTimestamp() ?? 0);
        $currency = $session->orders()->value('currency') ?? 'USD';
        $tenant = $session->tenant;

        return [
            'session' => [
                'id' => $session->getKey(),
                'status' => $session->status->value,
                'billing_mode' => $session->billing_mode->value,
            ],
            'orders' => $mapped,
            'totals' => [
                'outstanding' => round($outstanding, 2),
                'paid' => round($paid, 2),
                'currency' => $currency,
            ],
            // Methods the diner may pay with (enabled tenant gateways + cash).
            'payment_options' => $tenant ? $this->payments->optionsFor($tenant, $currency) : [],
            'bill' => $this->bill($session),
            'live_tracking' => $this->settings->liveTracking(),
            'updated_at' => now()->toIso8601String(),
            'orders_updated_at' => $lastUpdated ? date(DATE_ATOM, $lastUpdated) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function bill(DiningSession $session): array
    {
        $active = $session->billRequests()
            ->whereIn('status', ['pending', 'in_progress'])
            ->latest('id')
            ->first();

        return [
            'requestable' => $this->settings->allowBillRequest(),
            'request_open' => $active !== null,
            'request_status' => $active?->status->value,
            'requested_at' => $active?->requested_at?->toIso8601String(),
        ];
    }
}
