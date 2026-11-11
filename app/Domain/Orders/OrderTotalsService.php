<?php

namespace App\Domain\Orders;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderRound;

/**
 * Recomputes an order's money columns from its persisted, non-cancelled items.
 *
 * It deliberately never re-reads product prices: earlier rounds keep the price
 * they were sold at. Tax/service decisions are read from the order itself so a
 * later tenant settings change cannot rewrite an open bill.
 */
class OrderTotalsService
{
    /**
     * @return Order
     */
    public function recalculate(Order $order): Order
    {
        $items = $order->items()
            ->where(function ($query): void {
                $query->whereNull('order_round_id')
                    ->orWhereHas('round', fn ($round) => $round->where('status', OrderRound::STATUS_ACTIVE));
            })
            ->orderBy('id')
            ->get();

        $subtotal = round((float) $items->sum(fn ($item) => (float) $item->line_total), 2);
        $lineDiscounts = round((float) $items->sum(fn ($item) => (float) $item->discount_amount), 2);

        $orderDiscount = match ($order->discount_type) {
            'percent' => round($subtotal * min((float) $order->discount_value, 100) / 100, 2),
            'amount' => min(round((float) $order->discount_value, 2), $subtotal),
            default => 0.0,
        };

        $taxRate = (float) ($items->first()?->tax_rate ?? 0);
        $taxInclusive = (bool) $order->tax_inclusive;
        $taxedBase = round($subtotal - $orderDiscount, 2);

        if ($taxInclusive && $taxRate > 0) {
            $taxTotal = round($taxedBase * $taxRate / (100 + $taxRate), 2);
            $netBeforeTax = round($taxedBase - $taxTotal, 2);
        } else {
            $taxTotal = round($taxedBase * $taxRate / 100, 2);
            $netBeforeTax = $taxedBase;
        }

        $serviceCharge = (bool) $order->service_charge_applied
            ? round($netBeforeTax * (float) $order->service_charge_rate / 100, 2)
            : 0.0;

        $total = $taxInclusive
            ? round($taxedBase + $serviceCharge, 2)
            : round($taxedBase + $taxTotal + $serviceCharge, 2);

        $total = round($total + (float) $order->delivery_fee, 2);

        $order->forceFill([
            'subtotal' => $subtotal,
            'discount_total' => round($orderDiscount + $lineDiscounts, 2),
            'tax_total' => $taxTotal,
            'service_charge' => $serviceCharge,
            'total' => $total,
        ])->save();

        return $order;
    }
}
