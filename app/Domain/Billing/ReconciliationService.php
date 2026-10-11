<?php

namespace App\Domain\Billing;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Subscriptions\Enums\InvoiceStatus;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use Illuminate\Support\Facades\DB;

/**
 * Reconciles local payment/invoice records. Surfaces mismatches and unresolved
 * transactions. Historical records are never mutated to force a match.
 */
class ReconciliationService
{
    /** @return array<string, mixed> */
    public function summary(): array
    {
        $unresolved = PlatformPayment::query()
            ->whereIn('status', [PlatformPaymentStatus::Pending->value, PlatformPaymentStatus::Processing->value])
            ->count();

        $succeededWithoutPaidAt = PlatformPayment::query()
            ->where('status', PlatformPaymentStatus::Succeeded->value)
            ->whereNull('paid_at')
            ->count();

        $duplicateRefs = PlatformPayment::query()
            ->select('provider_ref', DB::raw('count(*) as total'))
            ->whereNotNull('provider_ref')
            ->groupBy('provider_ref')
            ->having('total', '>', 1)
            ->count();

        $outstanding = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->whereIn('status', InvoiceStatus::outstandingValues())
            ->sum('amount');

        $paidNoPayment = SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', InvoiceStatus::Paid->value)
            ->whereDoesntHave('platformPayments', fn ($q) => $q->where('status', PlatformPaymentStatus::Succeeded->value))
            ->count();

        return [
            'unresolved_payments' => $unresolved,
            'succeeded_without_paid_at' => $succeededWithoutPaidAt,
            'duplicate_references' => $duplicateRefs,
            'outstanding_total' => round($outstanding, 2),
            'paid_invoices_without_payment' => $paidNoPayment,
        ];
    }
}
