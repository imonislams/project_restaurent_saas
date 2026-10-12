<?php

namespace App\Http\Controllers\Orders;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Orders\Models\Order;
use App\Domain\PlatformSettings\PlatformSettings;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ReceiptController extends Controller
{
    public function __construct(protected AuditLogger $audit) {}

    public function show(Order $order): Response
    {
        $order->load(['items', 'payments.method', 'cashier:id,name', 'branch:id,name', 'tenant']);

        $tenant = $order->tenant;
        $reprint = request()->boolean('reprint');

        if ($reprint) {
            $this->audit->log('receipt.reprinted', $order, [
                'order_number' => $order->order_number,
            ]);
        }

        return Inertia::render('Orders/Receipt', [
            'order' => [
                'id' => $order->getKey(),
                'order_number' => $order->order_number,
                'order_type_label' => $order->order_type->label(),
                'status' => $order->status->value,
                'customer_name' => $order->customer_name,
                'branch_name' => $order->branch?->name,
                'cashier_name' => $order->cashier?->name,
                'currency' => $order->currency,
                'subtotal' => (float) $order->subtotal,
                'discount_total' => (float) $order->discount_total,
                'tax_total' => (float) $order->tax_total,
                'service_charge' => (float) $order->service_charge,
                'total' => (float) $order->total,
                'paid_total' => (float) $order->paid_total,
                'change_due' => (float) $order->change_due,
                'placed_at' => $order->placed_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->name,
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                    'notes' => $item->notes,
                ]),
                'payments' => $order->payments->map(fn ($payment) => [
                    'method' => $payment->method?->name ?? '—',
                    'amount' => (float) $payment->amount,
                    'change_due' => (float) $payment->change_due,
                    'status' => $payment->status->value,
                ]),
            ],
            'receipt' => [
                'header' => $tenant?->getSetting('receipt.header', $tenant?->name),
                'footer' => $tenant?->getSetting('receipt.footer', 'Thank you!'),
                'show_tax' => (bool) ($tenant?->getSetting('receipt.show_tax', true) ?? true),
                // Company branding shown in the footer — controlled globally by
                // the platform admin (Platform → Settings → Receipt Branding).
                'branding' => [
                    'show_logo' => (bool) app(PlatformSettings::class)->get('receipts.show_logo', true),
                    'show_details' => (bool) app(PlatformSettings::class)->get('receipts.show_company_details', true),
                    'logo_url' => $tenant?->logo_url,
                    'company_name' => $tenant?->getSetting('company.legal_name') ?? $tenant?->name,
                    'address' => $tenant?->getSetting('company.address') ?? $order->branch?->address,
                    'phone' => $tenant?->getSetting('company.phone') ?? $order->branch?->phone,
                    'email' => $tenant?->getSetting('company.email') ?? $tenant?->business_email,
                ],
            ],
        ]);
    }
}
