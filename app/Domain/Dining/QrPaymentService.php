<?php

namespace App\Domain\Dining;

use App\Domain\Dining\Models\DiningSession;
use App\Domain\Loyalty\LoyaltyService;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\PaymentGateways\TenantGatewayManager;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\PaymentGatewayManager;
use App\Domain\Tables\TableService;
use App\Domain\Tenancy\Models\Tenant;
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
     * Payment methods the diner may choose: every enabled tenant gateway
     * (Stripe / SSLCommerz / bKash / cash) plus a "pay at counter" fallback.
     * Nothing is charged here — this only advertises what the tenant accepts.
     *
     * @return list<array{provider: string, label: string, is_cash: bool, is_default: bool}>
     */
    public function optionsFor(Tenant $tenant, ?string $currency = null): array
    {
        $options = [];

        foreach (app(TenantGatewayManager::class)->enabledFor($tenant) as $gateway) {
            if ($currency && ! $gateway->supports($currency)) {
                continue;
            }

            $options[] = [
                'provider' => $gateway->provider,
                'label' => $gateway->displayName(),
                'is_cash' => $gateway->provider === 'cash',
                'is_default' => (bool) $gateway->is_default,
            ];
        }

        // Offer "pay at the counter" only when the tenant actually accepts cash
        // (an enabled cash gateway, or the accept-cash setting). A tenant that
        // turned cash off must not be shown a cash option it cannot settle.
        $acceptCash = (bool) ($tenant->getSetting('payments.accept_cash') ?? true);
        $hasCash = collect($options)->contains(fn (array $o) => $o['is_cash']);

        if (! $hasCash && $acceptCash) {
            $options[] = [
                'provider' => 'cash',
                'label' => 'Cash / pay at the counter',
                'is_cash' => true,
                'is_default' => $options === [],
            ];
        }

        return $options;
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
     * @return array{status: string, reference: ?string, payment_id?: int, redirect_url?: ?string, mode?: string}
     */
    public function startOnline(Order $order, ?string $provider = null, ?string $idempotencyKey = null, ?string $returnUrl = null): array
    {
        // Cash is settled physically by staff; a diner can never self-settle it.
        if ($provider === 'cash') {
            return ['status' => PaymentStatus::Pending->value, 'reference' => null, 'mode' => 'counter'];
        }

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

        $gateway = $this->gateways->for($provider);
        $result = $gateway->charge([
            'amount' => $outstanding,
            'currency' => $order->currency,
            'reference' => $order->order_number,
            'description' => 'Order '.$order->order_number,
            'success_url' => $returnUrl ?? '',
            'cancel_url' => $returnUrl ?? '',
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

        try {
            app(\App\Domain\Invoicing\OrderInvoiceService::class)->linkPayment($payment);
        } catch (\Throwable $e) {
            report($e);
        }

        if ($succeeded) {
            $this->reconcile($order);
        }

        return [
            'status' => $payment->status->value,
            'reference' => $result['reference'] ?? null,
            'payment_id' => $payment->getKey(),
            'redirect_url' => $result['redirect_url'] ?? null,
        ];
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

        // Reflect the verified payment on the invoice, and tell billing staff.
        try {
            app(\App\Domain\Invoicing\OrderInvoiceService::class)->refreshForOrder($order->fresh());
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            app(\App\Domain\Notifications\NotificationService::class)->onlinePaymentReceived($order->fresh(), $paid);
        } catch (\Throwable $e) {
            report($e);
        }

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
