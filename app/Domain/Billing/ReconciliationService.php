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

        // Outstanding is reported per currency — currencies are never summed.
        $outstandingByCurrency = SubscriptionInvoice::withoutGlobalScopes()
            ->select('currency', DB::raw('sum(amount) as total'))
            ->whereIn('status', InvoiceStatus::outstandingValues())
            ->groupBy('currency')
            ->get()
            ->map(fn ($row) => ['currency' => $row->currency, 'amount' => round((float) $row->total, 2)])
            ->values()
            ->all();

        $paidNoPayment = SubscriptionInvoice::withoutGlobalScopes()
            ->where('status', InvoiceStatus::Paid->value)
            ->whereDoesntHave('platformPayments', fn ($q) => $q->where('status', PlatformPaymentStatus::Succeeded->value))
            ->count();

        return [
            'unresolved_payments' => $unresolved,
            'succeeded_without_paid_at' => $succeededWithoutPaidAt,
            'duplicate_references' => $duplicateRefs,
            'outstanding_by_currency' => $outstandingByCurrency,
            'paid_invoices_without_payment' => $paidNoPayment,
        ];
    }
}
