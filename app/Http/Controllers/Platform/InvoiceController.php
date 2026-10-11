<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\InvoiceService;
use App\Domain\Billing\Models\BillingAdjustment;
use App\Domain\Billing\Models\CreditNote;
use App\Domain\Billing\Models\PaymentGateway;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\Models\PlatformRefund;
use App\Domain\Billing\PlatformPaymentService;
use App\Domain\PaymentGateways\PlatformGatewayManager;
use App\Domain\Subscriptions\Enums\InvoiceStatus;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class InvoiceController extends Controller
{
    public function __construct(
        protected InvoiceService $invoices,
        protected PlatformPaymentService $payments,
        protected PlatformGatewayManager $gateways,
    ) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
        ];

        $outstanding = (float) SubscriptionInvoice::withoutGlobalScopes()
            ->whereIn('status', InvoiceStatus::outstandingValues())->sum('amount');

        return Inertia::render('Platform/Invoices/Index', [
            'invoices' => SubscriptionInvoice::withoutGlobalScopes()
                ->with(['tenant:id,name'])
                ->when($filters['search'] !== '', fn ($q) => $q->where('number', 'like', '%'.$filters['search'].'%'))
                ->when($filters['status'] !== '', fn ($q) => $q->where('status', $filters['status']))
                ->latest('id')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (SubscriptionInvoice $invoice) => [
                    'id' => $invoice->getKey(),
                    'number' => $invoice->number,
                    'tenant' => $invoice->tenant?->name,
                    'tenant_id' => $invoice->tenant_id,
                    'amount' => (float) $invoice->amount,
                    'currency' => $invoice->currency,
                    'status' => $invoice->status->value,
                    'status_label' => $invoice->status->label(),
                    'issued_at' => $invoice->issued_at?->toIso8601String(),
                    'due_date' => $invoice->due_date?->toIso8601String(),
                    'paid_at' => $invoice->paid_at?->toIso8601String(),
                ]),
            'summary' => [
                'outstanding' => round($outstanding, 2),
                'paid_this_month' => round((float) SubscriptionInvoice::withoutGlobalScopes()
                    ->where('status', InvoiceStatus::Paid->value)
                    ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'), 2),
            ],
            'filters' => $filters,
            'options' => [
                'statuses' => collect(InvoiceStatus::cases())->map(fn (InvoiceStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
            ],
        ]);
    }

    public function show(SubscriptionInvoice $invoice): Response
    {
        $invoice->load(['items', 'creditNotes', 'adjustments', 'platformPayments.attempts', 'platformPayments.refunds']);

        return Inertia::render('Platform/Invoices/Show', [
            'invoice' => [
                'id' => $invoice->getKey(),
                'number' => $invoice->number,
                'tenant' => $invoice->tenant?->name,
                'tenant_id' => $invoice->tenant_id,
                'subtotal' => (float) $invoice->subtotal,
                'discount_amount' => (float) $invoice->discount_amount,
                'coupon_code' => $invoice->coupon_code,
                'amount' => (float) $invoice->amount,
                'currency' => $invoice->currency,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at?->toIso8601String(),
                'due_date' => $invoice->due_date?->toIso8601String(),
                'paid_at' => $invoice->paid_at?->toIso8601String(),
                'sent_at' => $invoice->sent_at?->toIso8601String(),
                'delivery_status' => $invoice->delivery_status,
                'outstanding' => $invoice->outstandingAmount(),
                'items' => $invoice->items->map(fn ($item) => [
                    'description' => $item->description,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'amount' => (float) $item->amount,
                ])->all(),
                'credit_notes' => $invoice->creditNotes->map(fn ($note) => [
                    'number' => $note->number,
                    'amount' => (float) $note->amount,
                    'reason' => $note->reason,
                    'issued_at' => $note->issued_at?->toIso8601String(),
                ])->all(),
                'adjustments' => $invoice->adjustments->map(fn ($adj) => [
                    'type' => $adj->type,
                    'amount' => (float) $adj->amount,
                    'reason' => $adj->reason,
                    'applied_at' => $adj->applied_at?->toIso8601String(),
                ])->all(),
                'payments' => $invoice->platformPayments->map(fn (PlatformPayment $payment) => [
                    'id' => $payment->getKey(),
                    'gateway' => $payment->gateway,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency,
                    'status' => $payment->status->value,
                    'status_label' => $payment->status->label(),
                    'provider_ref' => $payment->provider_ref,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'refunded_amount' => (float) $payment->refunded_amount,
                ])->all(),
            ],
            'gateways' => $this->availableGateways($invoice->currency),
        ]);
    }

    public function overview(): Response
    {
        $invoices = SubscriptionInvoice::withoutGlobalScopes();

        return Inertia::render('Platform/Billing/Overview', [
            'summary' => [
                'outstanding' => round((float) (clone $invoices)->whereIn('status', InvoiceStatus::outstandingValues())->sum('amount'), 2),
                'collected_month' => round((float) SubscriptionInvoice::withoutGlobalScopes()->where('status', InvoiceStatus::Paid->value)->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'), 2),
                'collected_total' => round((float) SubscriptionInvoice::withoutGlobalScopes()->where('status', InvoiceStatus::Paid->value)->sum('amount'), 2),
                'invoices_total' => SubscriptionInvoice::withoutGlobalScopes()->count(),
                'credit_notes_total' => round((float) CreditNote::query()->sum('amount'), 2),
                'adjustments_total' => round((float) BillingAdjustment::query()->sum('amount'), 2),
                'refunds_total' => round((float) PlatformRefund::query()->sum('amount'), 2),
                'payments_total' => PlatformPayment::query()->count(),
                'payments_failed' => PlatformPayment::query()->where('status', PlatformPaymentStatus::Failed->value)->count(),
                'payments_pending' => PlatformPayment::query()->whereIn('status', [PlatformPaymentStatus::Pending->value, PlatformPaymentStatus::Processing->value])->count(),
            ],
            'recent_invoices' => SubscriptionInvoice::withoutGlobalScopes()->with('tenant:id,name')->latest('id')->limit(8)->get()
                ->map(fn (SubscriptionInvoice $invoice) => [
                    'id' => $invoice->getKey(),
                    'number' => $invoice->number,
                    'tenant' => $invoice->tenant?->name,
                    'amount' => (float) $invoice->amount,
                    'currency' => $invoice->currency,
                    'status_label' => $invoice->status->label(),
                    'issued_at' => $invoice->issued_at?->toIso8601String(),
                ])->all(),
        ]);
    }

    public function creditNotes(Request $request): Response
    {
        $search = $request->string('search')->toString();

        return Inertia::render('Platform/Billing/CreditNotes', [
            'records' => CreditNote::query()
                ->with(['tenant:id,name', 'invoice:id,number'])
                ->when($search !== '', fn ($q) => $q->where('number', 'like', '%'.$search.'%'))
                ->latest('id')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (CreditNote $note) => [
                    'id' => $note->getKey(),
                    'number' => $note->number,
                    'tenant' => $note->tenant?->name,
                    'invoice' => $note->invoice?->number,
                    'amount' => (float) $note->amount,
                    'currency' => $note->currency,
                    'reason' => $note->reason,
                    'status' => $note->status,
                    'issued_at' => $note->issued_at?->toIso8601String(),
                ]),
            'filters' => ['search' => $search],
            'total' => round((float) CreditNote::query()->sum('amount'), 2),
        ]);
    }

    public function adjustments(Request $request): Response
    {
        $request->validate(['page' => ['nullable', 'integer']]);

        return Inertia::render('Platform/Billing/Adjustments', [
            'records' => BillingAdjustment::query()
                ->with(['tenant:id,name', 'invoice:id,number'])
                ->latest('id')
                ->paginate(25)
                ->through(fn (BillingAdjustment $adjustment) => [
                    'id' => $adjustment->getKey(),
                    'tenant' => $adjustment->tenant?->name,
                    'invoice' => $adjustment->invoice?->number,
                    'type' => $adjustment->type,
                    'amount' => (float) $adjustment->amount,
                    'currency' => $adjustment->currency,
                    'reason' => $adjustment->reason,
                    'applied_at' => $adjustment->applied_at?->toIso8601String(),
                ]),
            'total_debit' => round((float) BillingAdjustment::query()->where('type', 'debit')->sum('amount'), 2),
            'total_credit' => round((float) BillingAdjustment::query()->where('type', 'credit')->sum('amount'), 2),
        ]);
    }

    public function document(SubscriptionInvoice $invoice): SymfonyResponse
    {
        return $this->invoices->pdf($invoice)->download('invoice-'.$invoice->number.'.pdf');
    }

    public function send(Request $request, SubscriptionInvoice $invoice): RedirectResponse
    {
        $this->invoices->send($invoice, $request->user());

        return back()->with('success', 'Invoice queued for email delivery.');
    }

    public function creditNote(Request $request, SubscriptionInvoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $this->invoices->issueCreditNote($invoice, (float) $data['amount'], $data['reason'], $request->user());

        return back()->with('success', 'Credit note issued.');
    }

    public function adjustment(Request $request, SubscriptionInvoice $invoice): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:debit,credit'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $this->invoices->addAdjustment($invoice, $data['type'], (float) $data['amount'], $data['reason'], $request->user());

        return back()->with('success', 'Adjustment recorded.');
    }

    public function checkout(Request $request, SubscriptionInvoice $invoice): SymfonyResponse
    {
        abort_unless(app(\App\Domain\PlatformSettings\PlatformSettings::class)->get('features.gateway_checkout', true), 403, 'Gateway checkout is disabled. Settle invoices manually.');

        $data = $request->validate(['gateway_id' => ['required', 'integer', 'exists:payment_gateways,id']]);

        $config = PaymentGateway::query()->findOrFail($data['gateway_id']);

        $result = $this->payments->initiate($invoice, $config, $request->user());

        if ($result['redirect_url']) {
            // External redirect — Inertia::location makes the client do a full visit.
            return Inertia::location($result['redirect_url']);
        }

        return back()->with(
            $result['payment']->status === PlatformPaymentStatus::Failed ? 'error' : 'success',
            $result['payment']->status === PlatformPaymentStatus::Failed
                ? 'Checkout could not be started.'
                : 'Payment initiated. Settle it from the payments screen.',
        );
    }

    /** @return list<array{value: string, label: string}> */
    protected function availableGateways(string $currency): array
    {
        return $this->gateways->forCurrency($currency)
            ->map(fn (PaymentGateway $config) => ['value' => (string) $config->getKey(), 'label' => $config->displayName()])
            ->values()
            ->all();
    }
}
