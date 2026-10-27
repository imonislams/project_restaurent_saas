<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Billing\Enums\PlatformPaymentStatus;
use App\Domain\Billing\Models\PlatformPayment;
use App\Domain\Billing\Models\PlatformRefund;
use App\Domain\Billing\PlatformPaymentService;
use App\Domain\Billing\ReconciliationService;
use App\Domain\Billing\RefundService;
use App\Domain\PaymentGateways\GatewayProviderRegistry;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        protected RefundService $refunds,
        protected ReconciliationService $reconciliation,
        protected GatewayProviderRegistry $registry,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'gateway' => $request->string('gateway')->toString(),
        ];

        return Inertia::render('Platform/Payments/Index', [
            'payments' => PlatformPayment::query()
                ->with(['tenant:id,name'])
                ->when($filters['search'] !== '', fn ($q) => $q->where('provider_ref', 'like', '%'.$filters['search'].'%'))
                ->when($filters['status'] !== '', fn ($q) => $q->where('status', $filters['status']))
                ->when($filters['gateway'] !== '', fn ($q) => $q->where('gateway', $filters['gateway']))
                ->latest('id')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (PlatformPayment $payment) => [
                    'id' => $payment->getKey(),
                    'tenant' => $payment->tenant?->name,
                    'tenant_id' => $payment->tenant_id,
                    'gateway' => $payment->gateway,
                    'provider_ref' => $payment->provider_ref,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency,
                    'status' => $payment->status->value,
                    'status_label' => $payment->status->label(),
                    'attempt_number' => $payment->attempt_number,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'refunded_amount' => (float) $payment->refunded_amount,
                ]),
            'summary' => $this->reconciliation->summary(),
            'filters' => $filters,
            'options' => [
                'statuses' => collect(PlatformPaymentStatus::cases())->map(fn (PlatformPaymentStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
                'gateways' => collect($this->registry->providers())->map(fn (string $g) => ['value' => $g, 'label' => $this->registry->label($g)])->all(),
            ],
        ]);
    }

    public function refunds(Request $request): Response
    {
        return Inertia::render('Platform/Billing/Refunds', [
            'records' => PlatformRefund::query()
                ->with(['tenant:id,name', 'payment:id,gateway,provider_ref,amount,currency'])
                ->latest('id')
                ->paginate(25)
                ->through(fn (PlatformRefund $refund) => [
                    'id' => $refund->getKey(),
                    'tenant' => $refund->tenant?->name,
                    'payment' => $refund->payment?->provider_ref,
                    'gateway' => $refund->payment?->gateway,
                    'amount' => (float) $refund->amount,
                    'currency' => $refund->currency,
                    'reason' => $refund->reason,
                    'status' => $refund->status->value,
                    'gateway_ref' => $refund->gateway_ref,
                    'processed_at' => $refund->processed_at?->toIso8601String(),
                ]),
            'total' => round((float) PlatformRefund::query()->sum('amount'), 2),
        ]);
    }

    public function show(PlatformPayment $payment): Response
    {
        $payment->load(['attempts', 'refunds', 'invoice:id,number', 'tenant:id,name']);

        return Inertia::render('Platform/Payments/Show', [
            'payment' => [
                'id' => $payment->getKey(),
                'tenant' => $payment->tenant?->name,
                'tenant_id' => $payment->tenant_id,
                'invoice' => $payment->invoice?->number,
                'invoice_id' => $payment->subscription_invoice_id,
                'gateway' => $payment->gateway,
                'provider_ref' => $payment->provider_ref,
                'amount' => (float) $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status->value,
                'status_label' => $payment->status->label(),
                'failure_reason' => $payment->failure_reason,
                'settlement_status' => $payment->settlement_status,
                'confirmed_by' => $payment->confirmed_by
                    ? \App\Models\User::query()->find($payment->confirmed_by)?->name
                    : null,
                'confirmed_at' => $payment->confirmed_at?->toIso8601String(),
                'confirmation_note' => $payment->confirmation_note,
                'refunded_amount' => (float) $payment->refunded_amount,
                'refundable' => $payment->refundableAmount(),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'attempts' => $payment->attempts->map(fn ($attempt) => [
                    'status' => $attempt->status,
                    'reference' => $attempt->reference,
                    'created_at' => $attempt->created_at?->toIso8601String(),
                ])->all(),
                'refunds' => $payment->refunds->map(fn ($refund) => [
                    'amount' => (float) $refund->amount,
                    'reason' => $refund->reason,
                    'status' => $refund->status->value,
                    'gateway_ref' => $refund->gateway_ref,
                    'processed_at' => $refund->processed_at?->toIso8601String(),
                ])->all(),
            ],
        ]);
    }

    public function settle(Request $request, PlatformPayment $payment, PlatformPaymentService $payments): RedirectResponse
    {
        abort_if($payment->status === PlatformPaymentStatus::Succeeded, 422, 'This payment is already settled.');

        $payments->settleManually($payment, $request->user());

        return back()->with('success', 'Payment marked as settled.');
    }

    /** Confirm a manual payment after checking the money arrived. */
    public function approve(Request $request, PlatformPayment $payment, PlatformPaymentService $payments): RedirectResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $payments->approve($payment, $request->user(), $data['note'] ?? null, $data['reference'] ?? null);

        $this->audit->log('platform.payment_approved', $payment, [
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'reference' => $data['reference'] ?? null,
        ], $request->user(), $payment->tenant_id);

        return back()->with('success', 'Payment approved — the invoice is settled.');
    }

    /** Refuse a manual payment; the invoice stays open so the tenant can retry. */
    public function reject(Request $request, PlatformPayment $payment, PlatformPaymentService $payments): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $payments->reject($payment, $request->user(), $data['reason']);

        $this->audit->log('platform.payment_rejected', $payment, [
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'reason' => $data['reason'],
        ], $request->user(), $payment->tenant_id);

        return back()->with('success', 'Payment rejected — the tenant can try again.');
    }

    public function refund(Request $request, PlatformPayment $payment): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $this->refunds->request($payment, (float) $data['amount'], $data['reason'], $request->user());

        return back()->with('success', 'Refund recorded.');
    }
}
