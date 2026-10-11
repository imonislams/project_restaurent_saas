import Icon from '@/Components/Icon';
import Button from '@/Components/ui/Button';
import { Head, Link, router, usePage } from '@inertiajs/react';

// --- Interfaces ---

interface ReceiptItem {
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    notes: string | null;
}

interface ReceiptPayment {
    method: string;
    amount: number;
    change_due: number;
    status: string;
}

interface ReceiptOrder {
    id: number;
    order_number: string;
    order_type_label: string;
    status: string;
    customer_name: string | null;
    branch_name: string | null;
    cashier_name: string | null;
    currency: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    service_charge: number;
    total: number;
    paid_total: number;
    change_due: number;
    placed_at: string | null;
    items: ReceiptItem[];
    payments: ReceiptPayment[];
}

interface ReceiptSettings {
    header: string | null;
    footer: string | null;
    show_tax: boolean;
    show_logo: boolean;
}

const money = (n: number, currency: string) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Receipt({
    order,
    receipt,
}: {
    order: ReceiptOrder;
    receipt: ReceiptSettings;
}) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };

    return (
        <div className="min-h-screen bg-gray-100 py-6 sm:py-10 print:bg-white print:py-0 font-sans">
            <Head title={`Receipt · ${order.order_number}`} />

            <div className="mx-auto max-w-sm px-4 print:p-0 print:max-w-none">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 shadow-subtle print:hidden">
                        <Icon name="receipt" className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* --- THERMAL RECEIPT CARD --- */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card print:border-none print:shadow-none print:p-0 font-mono text-xs text-gray-900">
                    {/* Header */}
                    <div className="text-center pb-3 border-b-2 border-dashed border-gray-300">
                        <h1 className="text-base font-extrabold uppercase tracking-tight text-gray-950">
                            {receipt.header || 'Restrly Restaurant'}
                        </h1>
                        <p className="mt-0.5 text-[11px] text-gray-500 font-sans">
                            {order.branch_name ?? 'Main Branch'}
                        </p>
                        <div className="mt-2 font-mono text-sm font-black tracking-tight text-gray-900">
                            {order.order_number}
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="py-2.5 border-b-2 border-dashed border-gray-300 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date:</span>
                            <span>
                                {order.placed_at
                                    ? new Date(order.placed_at).toLocaleString(undefined, {
                                          dateStyle: 'short',
                                          timeStyle: 'short',
                                      })
                                    : '—'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Channel:</span>
                            <span className="font-bold uppercase">{order.order_type_label}</span>
                        </div>
                        {order.cashier_name && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Server/Cashier:</span>
                                <span>{order.cashier_name}</span>
                            </div>
                        )}
                        {order.customer_name && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Guest:</span>
                                <span>{order.customer_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Itemized Table */}
                    <div className="py-3 border-b-2 border-dashed border-gray-300">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    <th className="pb-1">Item</th>
                                    <th className="pb-1 text-center">Qty</th>
                                    <th className="pb-1 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items.map((item, idx) => (
                                    <tr key={idx} className="align-top">
                                        <td className="py-1.5 pr-2">
                                            <span className="font-semibold text-gray-900">{item.name}</span>
                                            {item.notes && (
                                                <div className="text-[10px] text-gray-500 italic mt-0.5">
                                                    &gt; {item.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-1.5 text-center font-bold text-gray-700 whitespace-nowrap">
                                            {item.quantity}
                                        </td>
                                        <td className="py-1.5 text-right font-bold text-gray-900 whitespace-nowrap">
                                            {money(item.line_total, order.currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Calculations */}
                    <div className="py-2.5 border-b-2 border-dashed border-gray-300 space-y-1 text-xs">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{money(order.subtotal, order.currency)}</span>
                        </div>

                        {order.discount_total > 0 && (
                            <div className="flex justify-between text-red-600 font-semibold">
                                <span>Discount</span>
                                <span>−{money(order.discount_total, order.currency)}</span>
                            </div>
                        )}

                        {receipt.show_tax && order.tax_total > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Tax</span>
                                <span>{money(order.tax_total, order.currency)}</span>
                            </div>
                        )}

                        {order.service_charge > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Service Charge</span>
                                <span>{money(order.service_charge, order.currency)}</span>
                            </div>
                        )}

                        {/* Grand Total */}
                        <div className="flex justify-between border-t border-gray-300 pt-1.5 text-sm font-extrabold text-gray-950">
                            <span>TOTAL</span>
                            <span>{money(order.total, order.currency)}</span>
                        </div>
                    </div>

                    {/* Payment Tender Details */}
                    <div className="py-2.5 border-b-2 border-dashed border-gray-300 space-y-1 text-xs text-gray-700">
                        {order.payments.map((p, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span className="capitalize">{p.method}</span>
                                <span className="font-bold">{money(p.amount, order.currency)}</span>
                            </div>
                        ))}

                        {order.change_due > 0 && (
                            <div className="flex justify-between font-bold text-emerald-800 pt-0.5">
                                <span>Change Returned</span>
                                <span>{money(order.change_due, order.currency)}</span>
                            </div>
                        )}
                    </div>

                    {/* Verification Simulation Barcode */}
                    <div className="pt-4 text-center space-y-2">
                        <div className="font-mono text-[9px] tracking-widest text-gray-400 select-none">
                            ||| | ||||| |||| | |||| ||| |||| | ||
                        </div>
                        <p className="text-[11px] font-sans text-gray-500 font-medium">
                            {receipt.footer || 'Thank you for your visit!'}
                        </p>
                    </div>
                </div>

                {/* Print & Action Controls (Hidden on Print) */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-xl bg-restrly-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-card hover:bg-restrly-700 active:scale-[0.99] transition"
                    >
                        Print Receipt 🖨
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            router.get(
                                route('orders.receipt', order.id),
                                { reprint: 1 },
                                { preserveState: true, preserveScroll: true },
                            )
                        }
                        className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-subtle"
                    >
                        Reprint (Audit)
                    </button>

                    <Link
                        href={route('pos.index')}
                        className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-subtle"
                    >
                        New Sale (POS)
                    </Link>

                    <Link
                        href={route('orders.index')}
                        className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-subtle"
                    >
                        Orders List
                    </Link>
                </div>
            </div>
        </div>
    );
}
