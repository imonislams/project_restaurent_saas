<?php

namespace App\Domain\Dining;

use App\Domain\Loyalty\LoyaltyService;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\PaymentGatewayManager;
use App\Domain\Tables\TableService;
use Illuminate\Support\Facades\DB;

/**
 * Customer payments for QR orders. Online payments go through the tenant's
 * configured gateway (manual → immediate, stub → pending then webhook-verified);
 * a payment is never treated as settled until the authoritative server state
 * says so. `reconcile()` finalizes an order once verified payments cover it.
 */
class QrPaymentService
{
    public function __construct(
        protected PaymentGatewayManager $gateways,
        protected DiningSessionService $sessions,
    ) {}

    public function outstanding(Order $order): float
    {
        $paid = (float) $order->payments()
            ->where('status', PaymentStatus::Succeeded->value)
            ->sum('amount');

        return max(0.0, round((float) $order->total - $paid, 2));
    }

    /**
     * Reconcile every unsettled order in a session (used by the tracking poll
     * so webhook-confirmed online payments finalize promptly).
     */
    public function reconcileSession(DiningSession $session): void
    {
        $session->orders()
            ->whereNotIn('status', [OrderStatus::Completed->value, OrderStatus::Voided->value])
            ->get()
            ->each(fn (Order $order) => $this->reconcile($order));
    }

    /**
     * @return array{status: string, reference: ?string, payment_id?: int}
     */
    public function startOnline(Order $order, ?string $idempotencyKey = null): array
    {
        $this->reconcile($order);

        $outstanding = $this->outstanding($order);

        if ($outstanding <= 0) {
            return ['status' => PaymentStatus::Succeeded->value, 'reference' => null];
        }

        if ($idempotencyKey) {
            $existing = $order->payments()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing) {
                return ['status' => $existing->status->value, 'reference' => $existing->reference, 'payment_id' => $existing->getKey()];
            }
        }

        $gateway = $this->gateways->for();
        $result = $gateway->charge([
            'amount' => $outstanding,
            'currency' => $order->currency,
            'reference' => $order->order_number,
        ]);

        $succeeded = ($result['status'] ?? 'pending') === 'succeeded';

        $payment = $order->payments()->create([
            'tenant_id' => $order->tenant_id,
            'amount' => $outstanding,
            'status' => $succeeded ? PaymentStatus::Succeeded->value : PaymentStatus::Pending->value,
            'reference' => $result['reference'] ?? null,
            'idempotency_key' => $idempotencyKey,
            'paid_at' => $succeeded ? now() : null,
        ]);

        $payment->attempts()->create([
            'tenant_id' => $order->tenant_id,
            'status' => $payment->status,
            'reference' => $result['reference'] ?? null,
            'payload' => ['provider' => $gateway->name(), 'amount' => $outstanding],
        ]);

        if ($succeeded) {
            $this->reconcile($order);
        }

        return ['status' => $payment->status->value, 'reference' => $result['reference'] ?? null, 'payment_id' => $payment->getKey()];
    }

    /**
     * Complete an order once its verified payments cover the total. Idempotent;
     * safe to call from a poll. Closes the dining session when everything is
     * settled.
     */
    public function reconcile(Order $order): Order
    {
        if ($order->status === OrderStatus::Completed) {
            return $order;
        }

        $paid = (float) $order->payments()
            ->where('status', PaymentStatus::Succeeded->value)
            ->sum('amount');

        if ($paid + 0.001 < (float) $order->total) {
            return $order;
        }

        DB::transaction(function () use ($order, $paid) {
            $order->forceFill([
                'paid_total' => round($paid, 2),
                'status' => OrderStatus::Completed,
                'completed_at' => now(),
            ])->save();

            $order->statusHistory()->create([
                'tenant_id' => $order->tenant_id,
                'status' => OrderStatus::Completed,
                'user_id' => null,
                'note' => 'Payment confirmed online',
            ]);
        });

        app(TableService::class)->refreshForOrder($order);

        if ($order->dining_session_id && $session = $order->diningSession) {
            $this->sessions->maybeCloseAfterSettlement($session);
        }

        try {
            app(LoyaltyService::class)->earnForOrder($order->fresh());
        } catch (\Throwable $e) {
            report($e);
        }

        return $order->fresh();
    }
}
