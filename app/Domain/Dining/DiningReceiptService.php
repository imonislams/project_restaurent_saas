<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Models\DiningSession;

/**
 * Builds the digital receipt / bill summary for a dining session.
 */
class DiningReceiptService
{
    /**
     * @return array<string, mixed>
     */
    public function forSession(DiningSession $session): array
    {
        $orders = $session->orders()->with(['items.modifiers'])->orderBy('id')->get();

        $subtotal = 0.0;
        $tax = 0.0;
        $service = 0.0;
        $discount = 0.0;
        $total = 0.0;
        $paid = 0.0;

        $mapped = $orders->map(function ($order) use (&$subtotal, &$tax, &$service, &$discount, &$total, &$paid) {
            if ($order->status->value !== 'voided') {
                $subtotal += (float) $order->subtotal;
                $tax += (float) $order->tax_total;
                $service += (float) $order->service_charge;
                $discount += (float) $order->discount_total;
                $total += (float) $order->total;
                $paid += (float) $order->paid_total;
            }

            return [
                'number' => $order->order_number,
                'status' => $order->status->value,
                'total' => (float) $order->total,
                'paid_total' => (float) $order->paid_total,
                'placed_at' => $order->placed_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name,
                    'quantity' => (float) $item->quantity,
                    'line_total' => (float) $item->line_total,
                    'modifiers' => $item->modifiers->map(fn ($m) => $m->name)->all(),
                ]),
            ];
        });

        return [
            'orders' => $mapped,
            'subtotal' => round($subtotal, 2),
            'tax_total' => round($tax, 2),
            'service_charge' => round($service, 2),
            'discount_total' => round($discount, 2),
            'total' => round($total, 2),
            'paid_total' => round($paid, 2),
            'outstanding' => round(max(0, $total - $paid), 2),
            'currency' => $orders->first()?->currency ?? 'USD',
            'settled' => $session->isClosed(),
            'closed_at' => $session->closed_at?->toIso8601String(),
        ];
    }
}
