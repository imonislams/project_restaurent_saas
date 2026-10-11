import Icon from '@/Components/Icon';
import Badge, { BadgeTone } from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

// --- Interfaces ---

interface OrderItem {
    name: string;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_amount?: number;
    line_total: number;
    notes: string | null;
}

interface OrderPayment {
    method: string;
    amount: number;
    tendered?: number | null;
    change_due?: number;
    status: string;
    reference?: string | null;
}

interface OrderHistoryEntry {
    note: string | null;
    user: string | null;
    at: string | null;
}

interface OrderDetail {
    id: number;
    order_number: string;
    order_type_label: string;
    status: string;
    fulfillment_status: string;
    fulfillment_label: string;
    is_open: boolean;
    kitchen_status: string | null;
    table_name: string | null;
    customer_name: string | null;
    covers: number | null;
    notes: string | null;
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
    can_void: boolean;
    items: OrderItem[];
    payments: OrderPayment[];
    history: OrderHistoryEntry[];
}

interface PaymentMethod {
    id: number;
    name: string;
    type: string;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    completed: 'success',
    settled: 'info',
    held: 'warning',
    open: 'warning',
    voided: 'danger',
    cancelled: 'danger',
    refunded: 'neutral',
};

const money = (n: number, currency: string) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrderShow({
    order,
    nextFulfillment,
    paymentMethods,
}: {
    order: OrderDetail;
    nextFulfillment: { value: string; label: string }[];
    paymentMethods: PaymentMethod[];
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const permissions: string[] = auth?.permissions ?? [];

    const canVoid = permissions.includes('orders.void') && order.can_void;
    const canFulfill = permissions.includes('orders.update');
    const canSettle = permissions.includes('pos.use') && order.is_open;

    const [showVoid, setShowVoid] = useState(false);
    const [showSettle, setShowSettle] = useState(false);

    // Forms
    const voidForm = useForm({ manager_pin: '' });

    // Settle Order State
    const [settleMethodId, setSettleMethodId] = useState<number>(paymentMethods[0]?.id ?? 1);
    const [settleTendered, setSettleTendered] = useState<number>(order.total);
    const [settleManagerPin, setSettleManagerPin] = useState('');
    const settleForm = useForm({});

    const selectedMethod = paymentMethods.find((m) => m.id === settleMethodId);
    const isCashMethod = selectedMethod?.type === 'cash';
    const settleChange = isCashMethod ? Math.max(0, settleTendered - order.total) : 0;

    // Cash preset chips for settle modal
    const cashPresets = useMemo(() => {
        const total = order.total;
        const rounded5 = Math.ceil(total / 5) * 5;
        const rounded10 = Math.ceil(total / 10) * 10;
        const rounded50 = Math.ceil(total / 50) * 50;
        const rounded100 = Math.ceil(total / 100) * 100;
        const set = new Set([total, rounded5, rounded10, rounded50, rounded100].filter((v) => v >= total));
        return Array.from(set).slice(0, 4);
    }, [order.total]);

    const handleSettleSubmit = () => {
        const payload = {
            payments: [
                {
                    payment_method_id: settleMethodId,
                    amount: order.total,
                    tendered: isCashMethod ? settleTendered : null,
                },
            ],
            manager_pin: settleManagerPin || null,
        };

        settleForm.transform(() => payload);
        settleForm.post(route('orders.settle', order.id), {
            onSuccess: () => setShowSettle(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('orders.index')}
                            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition shadow-subtle"
                            title="Back to Orders List"
                        >
                            <Icon name="chevron" className="h-4 w-4 rotate-180" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-mono text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                                    {order.order_number}
                                </h1>
                                <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
                                    {order.status}
                                </Badge>
                                {order.table_name && (
                                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                                        {order.table_name}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {[
                                    order.order_type_label,
                                    order.covers ? `${order.covers} guests` : null,
                                    order.branch_name,
                                    order.cashier_name ? `Cashier: ${order.cashier_name}` : null,
                                    order.placed_at ? new Date(order.placed_at).toLocaleString() : null,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        </div>
                    </div>

                    {/* Top Action Toolbar */}
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('orders.receipt', order.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 shadow-subtle hover:bg-gray-50 transition"
                        >
                            <span>🖨 Receipt</span>
                        </Link>

                        {canSettle && (
                            <button
                                type="button"
                                onClick={() => setShowSettle(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-restrly-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-card hover:bg-restrly-700 active:scale-[0.99] transition"
                            >
                                <Icon name="wallet" className="h-4 w-4" />
                                <span>Settle Order ({money(order.total, order.currency)})</span>
                            </button>
                        )}

                        {canVoid && (
                            <button
                                type="button"
                                onClick={() => setShowVoid(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm font-semibold text-red-700 shadow-subtle hover:bg-red-100 transition"
                            >
                                <Icon name="trash" className="h-4 w-4" />
                                <span>Void Order</span>
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Order ${order.order_number}`} />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Alerts */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 shadow-subtle">
                            <Icon name="receipt" className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-medium text-red-800 shadow-subtle">
                            <Icon name="alert" className="h-4 w-4 text-red-600 shrink-0" />
                            <span>{flash.error}</span>
                        </div>
                    )}

                    {/* Fulfillment & Kitchen Progression Status Bar */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Order Lifecycle:
                            </span>
                            <Badge tone="info">
                                Fulfillment: {order.fulfillment_label}
                            </Badge>
                            {order.kitchen_status && (
                                <Badge tone="warning">
                                    Kitchen: {order.kitchen_status}
                                </Badge>
                            )}
                            {order.is_open && (
                                <Badge tone="warning">
                                    Held / Unsettled
                                </Badge>
                            )}
                        </div>

                        {/* Allowed Next Fulfillment Transition Buttons */}
                        {canFulfill && nextFulfillment.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-400">Advance to:</span>
                                {nextFulfillment.map((next) => (
                                    <Button
                                        key={next.value}
                                        size="xs"
                                        variant="outline"
                                        onClick={() =>
                                            router.patch(
                                                route('orders.fulfillment', order.id),
                                                { fulfillment_status: next.value },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Mark {next.label} →
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content Grid: 2 Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* LEFT COLUMN: Items Breakdown & Audit History */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Line Items Card */}
                            <div className="rounded-2xl border border-gray-200 bg-white shadow-subtle overflow-hidden">
                                <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3.5 flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Ordered Items ({order.items.length})
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                        <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                            <tr>
                                                <th className="px-5 py-3">Item Description</th>
                                                <th className="px-5 py-3 text-right">Qty</th>
                                                <th className="px-5 py-3 text-right">Unit Price</th>
                                                <th className="px-5 py-3 text-right">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {order.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-semibold text-gray-900">
                                                            {item.name}
                                                        </div>
                                                        {item.notes && (
                                                            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 rounded px-2 py-0.5 border border-amber-200 w-fit">
                                                                <span>Kitchen Note:</span>
                                                                <span className="italic">{item.notes}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-gray-800">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs text-gray-600">
                                                        {money(item.unit_price, order.currency)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-gray-900">
                                                        {money(item.line_total, order.currency)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Customer Notes */}
                            {order.notes && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-subtle">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                                        Special Order Instructions
                                    </h4>
                                    <p className="text-xs text-amber-900 font-medium">
                                        {order.notes}
                                    </p>
                                </div>
                            )}

                            {/* Audit & Status History Timeline */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-subtle">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                    Audit &amp; Lifecycle Timeline
                                </h3>

                                {order.history.length === 0 ? (
                                    <p className="text-xs text-gray-400">No lifecycle events recorded.</p>
                                ) : (
                                    <div className="relative pl-4 border-l-2 border-gray-200 space-y-3">
                                        {order.history.map((entry, idx) => (
                                            <div key={idx} className="relative text-xs">
                                                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-restrly-500 border-2 border-white shadow-subtle" />
                                                <div className="font-semibold text-gray-800">
                                                    {entry.note}
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-0.5">
                                                    {entry.user ? `${entry.user} · ` : ''}
                                                    {entry.at ? new Date(entry.at).toLocaleString() : '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Financial Summary, Payments & Destination */}
                        <div className="space-y-6">
                            {/* Financial Summary Card */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-subtle">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                    Financial Reconciliation
                                </h3>

                                <dl className="space-y-2 text-xs sm:text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <dt>Subtotal</dt>
                                        <dd className="font-mono font-medium">{money(order.subtotal, order.currency)}</dd>
                                    </div>

                                    {order.discount_total > 0 && (
                                        <div className="flex justify-between text-red-600 font-semibold">
                                            <dt>Discount</dt>
                                            <dd className="font-mono">−{money(order.discount_total, order.currency)}</dd>
                                        </div>
                                    )}

                                    {order.tax_total > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <dt>Tax</dt>
                                            <dd className="font-mono font-medium">{money(order.tax_total, order.currency)}</dd>
                                        </div>
                                    )}

                                    {order.service_charge > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <dt>Service Charge</dt>
                                            <dd className="font-mono font-medium">{money(order.service_charge, order.currency)}</dd>
                                        </div>
                                    )}

                                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                                        <dt>Total Amount</dt>
                                        <dd className="font-mono text-lg font-black tracking-tight">{money(order.total, order.currency)}</dd>
                                    </div>

                                    <div className="flex justify-between border-t border-gray-100 pt-2 text-xs text-gray-600">
                                        <dt>Total Paid</dt>
                                        <dd className="font-mono font-semibold text-emerald-700">{money(order.paid_total, order.currency)}</dd>
                                    </div>

                                    {order.change_due > 0 && (
                                        <div className="flex justify-between text-xs text-gray-600">
                                            <dt>Change Due / Returned</dt>
                                            <dd className="font-mono font-semibold">{money(order.change_due, order.currency)}</dd>
                                        </div>
                                    )}
                                </dl>

                                {/* Settle Callout if Held */}
                                {order.is_open && canSettle && (
                                    <div className="mt-4 pt-3 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setShowSettle(true)}
                                            className="w-full rounded-xl bg-restrly-600 py-2.5 text-xs font-bold text-white shadow-card hover:bg-restrly-700 active:scale-[0.99] transition"
                                        >
                                            Settle Balance ({money(order.total, order.currency)})
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Recorded Payments Card */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-subtle">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                    Payments Tendered ({order.payments.length})
                                </h3>

                                {order.payments.length === 0 ? (
                                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                                        No payments recorded yet. Order is held.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {order.payments.map((p, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon name="wallet" className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{p.method}</div>
                                                        <span className="text-[10px] text-gray-400 capitalize">
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="font-mono text-xs font-bold text-gray-900">
                                                    {money(p.amount, order.currency)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Customer & Destination Context Card */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-subtle text-xs space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                    Channel &amp; Table
                                </h3>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Channel</span>
                                    <span className="font-semibold text-gray-800">{order.order_type_label}</span>
                                </div>
                                {order.table_name && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Dine-In Table</span>
                                        <span className="font-bold text-amber-800">{order.table_name}</span>
                                    </div>
                                )}
                                {order.customer_name && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Customer</span>
                                        <span className="font-semibold text-gray-800">{order.customer_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Branch</span>
                                    <span className="font-medium text-gray-800">{order.branch_name ?? '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SETTLE MODAL --- */}
            {showSettle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900">Settle Order Balance</h3>
                            <button
                                type="button"
                                onClick={() => setShowSettle(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Amount Due Card */}
                        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4 text-center">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Total Due
                            </span>
                            <div className="mt-1 font-mono text-2xl font-black text-gray-900">
                                {money(order.total, order.currency)}
                            </div>
                        </div>

                        {/* Method Selector */}
                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-700 block mb-1">
                                    Payment Method
                                </label>
                                <select
                                    aria-label="Payment Method"
                                    value={settleMethodId}
                                    onChange={(e) => setSettleMethodId(Number(e.target.value))}
                                    className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-semibold text-gray-900 shadow-subtle"
                                >
                                    {paymentMethods.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Cash Tendered & Quick Chips */}
                            {isCashMethod && (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2.5">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-600 block mb-1">
                                            Cash Received
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={order.total}
                                            value={settleTendered}
                                            onChange={(e) => setSettleTendered(Number(e.target.value))}
                                            className="w-full rounded-xl border border-gray-300 py-1.5 px-3 font-mono text-sm font-bold text-gray-900"
                                        />
                                    </div>

                                    {/* Preset Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {cashPresets.map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setSettleTendered(amt)}
                                                className={`rounded-lg px-2 py-0.5 text-xs font-mono font-bold transition ${
                                                    settleTendered === amt
                                                        ? 'bg-restrly-600 text-white'
                                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                {amt === order.total ? 'Exact ' : ''}
                                                {money(amt, order.currency)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-baseline justify-between border-t border-gray-200 pt-2 text-xs text-emerald-800">
                                        <span className="font-bold">Change Due:</span>
                                        <span className="font-mono text-base font-extrabold">
                                            {money(settleChange, order.currency)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    Manager PIN (if required)
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter PIN if authorized"
                                    value={settleManagerPin}
                                    onChange={(e) => setSettleManagerPin(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 py-1.5 px-3 text-xs"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowSettle(false)}
                                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSettleSubmit}
                                disabled={settleForm.processing}
                                className="rounded-xl bg-restrly-600 px-5 py-2 text-xs font-bold text-white shadow-card hover:bg-restrly-700 disabled:opacity-50"
                            >
                                {settleForm.processing ? 'Processing...' : 'Complete Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VOID MODAL --- */}
            {showVoid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 text-red-600">
                                <Icon name="alert" className="h-5 w-5" />
                                <h3 className="text-base font-bold text-gray-900">Void Order {order.order_number}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowVoid(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 space-y-1">
                            <p className="font-bold">⚠️ Irreversible Action:</p>
                            <p>Voiding this sale reverses inventory stock movements, marks payments as refunded, and audits the cancellation. A manager PIN is required.</p>
                        </div>

                        <div className="mt-4">
                            <label className="text-xs font-semibold text-gray-700 block mb-1">
                                Manager PIN
                            </label>
                            <input
                                type="password"
                                placeholder="Enter Manager PIN"
                                value={voidForm.data.manager_pin}
                                onChange={(e) => voidForm.setData('manager_pin', e.target.value)}
                                className="w-full rounded-xl border border-gray-300 py-2 px-3 text-xs font-mono tracking-widest text-gray-900"
                            />
                            {Object.values(voidForm.errors)[0] && (
                                <p className="mt-1 text-xs text-red-600 font-medium">
                                    {Object.values(voidForm.errors)[0]}
                                </p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowVoid(false)}
                                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    voidForm.post(route('orders.void', order.id), {
                                        onSuccess: () => setShowVoid(false),
                                    })
                                }
                                disabled={voidForm.processing || !voidForm.data.manager_pin}
                                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-subtle hover:bg-red-700 disabled:opacity-50"
                            >
                                {voidForm.processing ? 'Voiding...' : 'Confirm Void Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
