<?php

namespace App\Domain\Billing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Enums\RefundStatus;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\Models\PlatformRefund;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Refund workflow. Never allows a refund above the refundable balance, and only
 * reports success after the gateway confirms (or a manual refund is asserted).
 */
class RefundService
{
    public function __construct(
        protected PlatformGatewayManager $gateways,
        protected AuditLogger $audit,
    ) {}

    public function request(PlatformPayment $payment, float $amount, string $reason, User $actor): PlatformRefund
    {
        if (! $payment->status->isSuccessful()) {
            throw ValidationException::withMessages(['amount' => 'Only successful payments can be refunded.']);
        }

        if ($amount <= 0 || $amount > $payment->refundableAmount() + 0.001) {
            throw ValidationException::withMessages([
                'amount' => 'The refund exceeds the refundable balance of '.number_format($payment->refundableAmount(), 2).'.',
            ]);
        }

        $config = $this->gateways->config($payment->gateway);
        $driver = $this->gateways->driver($payment->gateway);

        $result = $config
            ? $driver->refund($config, (string) $payment->provider_ref, $amount, $reason)
            : ['status' => 'pending', 'reference' => null, 'raw' => []];

        return DB::transaction(function () use ($payment, $amount, $reason, $actor, $result) {
            $refund = PlatformRefund::create([
                'platform_payment_id' => $payment->getKey(),
                'tenant_id' => $payment->tenant_id,
                'amount' => round($amount, 2),
                'currency' => $payment->currency,
                'reason' => $reason,
                'status' => RefundStatus::from($result['status']),
                'gateway_ref' => $result['reference'],
                'initiated_by' => $actor->getKey(),
                'processed_at' => $result['status'] === 'succeeded' ? now() : null,
            ]);

            // A manual refund is asserted by the operator; a gateway refund only
            // updates the payment state once it reports success.
            if ($payment->gateway === 'manual' || $refund->status === RefundStatus::Succeeded) {
                $refunded = round((float) $payment->refunded_amount + $amount, 2);

                $payment->forceFill([
                    'refunded_amount' => $refunded,
                    'status' => $refunded >= (float) $payment->amount
                        ? PlatformPaymentStatus::Refunded
                        : PlatformPaymentStatus::PartiallyRefunded,
                ])->save();
            }

            $this->audit->log('platform.refund_requested', $refund, [
                'payment' => $payment->getKey(),
                'amount' => (float) $refund->amount,
                'status' => $refund->status->value,
            ], $actor, $payment->tenant_id);

            return $refund;
        });
    }
}
