<?php

namespace App\Domain\Invoicing;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Dining\Enums\BillingMode;
use App\Domain\Documents\DocumentNumberGenerator;
use App\Domain\Invoicing\Enums\InvoiceStatus;
use App\Domain\Invoicing\Models\Invoice;
use App\Domain\Invoicing\Models\InvoiceOrder;
use App\Domain\Orders\Enums\OrderStatus;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Builds and maintains restaurant invoices (the Bill/Invoice workflow) from
 * served orders.
 *
 * - One invoice per table / dining session while it is open (combined bills).
 * - Idempotent: an order is attached at most once (`invoice_orders.order_id`
 *   is unique) so retried serving never double-charges.
 * - Finalized (paid/void) invoices are never modified — a fresh order gets a
 *   new invoice instead.
 */
class OrderInvoiceService
{
    public function __construct(
        protected DocumentNumberGenerator $numbers,
        protected AuditLogger $audit,
        protected TenantContext $context,
    ) {}

    public function invoiceForOrder(Order $order): ?Invoice
    {
        return InvoiceOrder::query()
            ->where('order_id', $order->getKey())
            ->first()?->invoice;
    }

    /**
     * Ensure a served order is on an open invoice, creating one if needed.
     */
    public function forServedOrder(Order $order): ?Invoice
    {
        if ($order->status === OrderStatus::Voided || ! $order->acceptance_status->isConfirmed()) {
            return null;
        }

        if ($existing = $this->invoiceForOrder($order)) {
            return $existing;
        }

        $invoice = DB::transaction(function () use ($order) {
            $invoice = $this->openInvoiceFor($order) ?? $this->create($order);

            return $this->addOrder($invoice, $order);
        });

        // First time this order is billed — tell the branch's billing users.
        try {
            app(\App\Domain\Notifications\NotificationService::class)->orderServedForBilling($order, $invoice);
        } catch (\Throwable $e) {
            report($e);
        }

        return $invoice;
    }

    /**
     * The open invoice for a dining session, if one exists.
     */
    public function openInvoiceForSession(\App\Domain\Dining\Models\DiningSession $session): ?Invoice
    {
        return Invoice::query()
            ->where('dining_session_id', $session->getKey())
            ->where('status', InvoiceStatus::Open->value)
            ->latest('id')
            ->first();
    }

    /**
     * Link a payment to the invoice its order is billed on (idempotent).
     */
    public function linkPayment(\App\Domain\Payments\Models\Payment $payment): void
    {
        if ($payment->invoice_id || ! $payment->order) {
            return;
        }

        if ($invoice = $this->invoiceForOrder($payment->order)) {
            $payment->forceFill(['invoice_id' => $invoice->getKey()])->save();
        }
    }

    /**
     * Recompute the invoice a served order belongs to (if any) after payments
     * change. No-op when the order is not yet billed.
     */
    public function refreshForOrder(Order $order): void
    {
        if ($invoice = $this->invoiceForOrder($order)) {
            $this->recalculate($invoice);
        }
    }

    /**
     * Attach an eligible order to an editable invoice and recalculate. Refuses
     * to touch a finalized invoice (the caller should open a new one instead).
     */
    public function addOrder(Invoice $invoice, Order $order): Invoice
    {
        if (! $invoice->isEditable()) {
            throw ValidationException::withMessages([
                'invoice' => 'This invoice is finalized and can no longer be changed.',
            ]);
        }

        if ($existing = $this->invoiceForOrder($order)) {
            return $this->recalculate($existing);
        }

        $invoice->orders()->attach($order->getKey(), [
            'tenant_id' => $invoice->tenant_id,
            'amount' => (float) $order->total,
            'added_at' => now(),
        ]);

        return $this->recalculate($invoice);
    }

    /**
     * Recompute totals from the linked orders and advance the invoice status.
     */
    public function recalculate(Invoice $invoice): Invoice
    {
        $orders = $invoice->orders()->get();

        $sum = fn (string $column): float => round((float) $orders->sum($column), 2);

        $total = $sum('total');
        $paid = $sum('paid_total');

        $status = $invoice->status;

        if (! $status->isFinalized()) {
            if ($total > 0 && $paid >= $total - 0.001) {
                $status = InvoiceStatus::Paid;
            } elseif ($paid > 0) {
                $status = InvoiceStatus::PartiallyPaid;
            } else {
                $status = InvoiceStatus::Open;
            }
        }

        $invoice->forceFill([
            'subtotal' => $sum('subtotal'),
            'discount_total' => $sum('discount_total'),
            'tax_total' => $sum('tax_total'),
            'service_charge' => $sum('service_charge'),
            'total' => $total,
            'paid_total' => $paid,
            'status' => $status,
            'paid_at' => $status === InvoiceStatus::Paid ? ($invoice->paid_at ?? now()) : null,
        ])->save();

        return $invoice;
    }

    /**
     * Find the open invoice this order should join, if any.
     */
    protected function openInvoiceFor(Order $order): ?Invoice
    {
        $query = Invoice::query()
            ->where('branch_id', $order->branch_id)
            ->where('status', InvoiceStatus::Open->value);

        if ($order->dining_session_id) {
            $query->where('dining_session_id', $order->dining_session_id);

            if ($this->individualBilling($order)) {
                $query->where('dining_participant_id', $order->dining_participant_id);
            }
        } elseif ($order->table_id) {
            $query->whereNull('dining_session_id')->where('table_id', $order->table_id);
        } else {
            return null;
        }

        return $query->latest('id')->first();
    }

    protected function create(Order $order): Invoice
    {
        $invoice = Invoice::create([
            'tenant_id' => $order->tenant_id,
            'branch_id' => $order->branch_id,
            'table_id' => $order->table_id,
            'dining_session_id' => $order->dining_session_id,
            'dining_participant_id' => $order->dining_participant_id,
            'customer_id' => $order->customer_id,
            'number' => $this->numbers->next($order->tenant_id, 'order_invoice', 'BIL'),
            'status' => InvoiceStatus::Open,
            'currency' => $order->currency,
            'issued_at' => now(),
            'created_by' => auth()->id(),
        ]);

        $this->audit->log('invoice.created', $invoice, ['number' => $invoice->number], null, $order->tenant_id);

        return $invoice;
    }

    protected function individualBilling(Order $order): bool
    {
        return $order->diningSession?->billing_mode === BillingMode::Individual;
    }
}
