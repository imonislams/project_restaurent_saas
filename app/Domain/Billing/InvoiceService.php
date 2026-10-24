<?php

namespace App\Domain\Billing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Models\BillingAdjustment;
use App\Domain\Billing\Models\CreditNote;
use App\Domain\Documents\DocumentNumberGenerator;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Mail\InvoiceIssuedMail;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Mail;

/**
 * Platform invoice document generation, delivery, credit notes and adjustments.
 * Finalized invoices are corrected through credit notes / adjustments — never
 * rewritten — so their numbering and history stay immutable.
 */
class InvoiceService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected AuditLogger $audit,
    ) {}

    /** @return array<string, mixed> */
    public function documentData(SubscriptionInvoice $invoice): array
    {
        $invoice->loadMissing(['items', 'adjustments', 'creditNotes', 'subscription.plan', 'platformPayments']);
        $tenant = $invoice->tenant;
        $snapshot = $invoice->billing_snapshot ?? [];
        $payment = $invoice->latestSuccessfulPayment();

        return [
            'platform' => [
                'name' => app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('general.platform_name', config('app.name')),
                'email' => config('mail.from.address'),
            ],
            'invoice' => $invoice,
            'tenant' => [
                'name' => $snapshot['name'] ?? $tenant?->name,
                'email' => $snapshot['email'] ?? $tenant?->getSetting('billing.email', $tenant?->business_email),
                'address' => $snapshot['address'] ?? $tenant?->getSetting('company.address'),
                'city' => $snapshot['city'] ?? null,
                'postal_code' => $snapshot['postal_code'] ?? null,
                'country' => $snapshot['country'] ?? null,
                'tax_id' => $snapshot['tax_id'] ?? null,
            ],
            'payment' => $payment ? [
                'gateway' => $payment->meta['gateway'] ?? ucfirst($payment->gateway),
                'reference' => $payment->provider_ref,
                'paid_at' => $payment->paid_at,
            ] : null,
            'items' => $invoice->items,
            'credit_notes' => $invoice->creditNotes,
            'adjustments' => $invoice->adjustments,
        ];
    }

    public function pdf(SubscriptionInvoice $invoice)
    {
        return Pdf::loadView('invoices.document', $this->documentData($invoice));
    }

    public function send(SubscriptionInvoice $invoice, User $actor): SubscriptionInvoice
    {
        $invoice->forceFill([
            'sent_at' => now(),
            'delivery_status' => 'queued',
        ])->save();

        $email = $invoice->tenant?->getSetting('billing.email', $invoice->tenant?->business_email);

        if ($email) {
            Mail::to($email)->queue(new InvoiceIssuedMail($invoice->fresh(['items'])));
        }

        $this->audit->log('platform.invoice_sent', $invoice, ['number' => $invoice->number], $actor, $invoice->tenant_id);

        return $invoice;
    }

    public function issueCreditNote(SubscriptionInvoice $invoice, float $amount, string $reason, User $actor): CreditNote
    {
        $creditNote = CreditNote::create([
            'tenant_id' => $invoice->tenant_id,
            'subscription_invoice_id' => $invoice->getKey(),
            'number' => $this->numbers->next($invoice->tenant_id, 'credit_note', 'CN'),
            'amount' => round($amount, 2),
            'currency' => $invoice->currency,
            'reason' => $reason,
            'status' => 'issued',
            'issued_by' => $actor->getKey(),
            'issued_at' => now(),
        ]);

        $this->audit->log('platform.credit_note_issued', $creditNote, [
            'invoice' => $invoice->number,
            'amount' => (float) $creditNote->amount,
        ], $actor, $invoice->tenant_id);

        return $creditNote;
    }

    public function addAdjustment(SubscriptionInvoice $invoice, string $type, float $amount, string $reason, User $actor): BillingAdjustment
    {
        $adjustment = BillingAdjustment::create([
            'tenant_id' => $invoice->tenant_id,
            'subscription_invoice_id' => $invoice->getKey(),
            'type' => $type,
            'amount' => round($amount, 2),
            'currency' => $invoice->currency,
            'reason' => $reason,
            'created_by' => $actor->getKey(),
            'applied_at' => now(),
        ]);

        $this->audit->log('platform.billing_adjustment_added', $adjustment, [
            'invoice' => $invoice->number,
            'type' => $type,
            'amount' => (float) $adjustment->amount,
        ], $actor, $invoice->tenant_id);

        return $adjustment;
    }
}
