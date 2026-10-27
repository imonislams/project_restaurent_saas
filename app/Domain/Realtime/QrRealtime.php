<?php

namespace App\Domain\Realtime;

use App\Domain\Orders\Models\Order;
use App\Domain\Realtime\Events\QrSessionUpdated;

/**
 * Pushes a refresh to a diner's tracking page. The page re-reads its own
 * token-authorised status endpoint, so the socket never carries order data.
 */
class QrRealtime
{
    public function __construct(protected RealtimeBroadcaster $broadcaster) {}

    /** Notify the dining session behind this order, when it has one. */
    public function notifyOrder(Order $order, string $reason): void
    {
        $token = $order->diningSession?->qrToken();

        if ($token === null || $token === '') {
            return;
        }

        $this->broadcaster->send(new QrSessionUpdated($token, $reason), 'customer');
    }
}
