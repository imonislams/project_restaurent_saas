import Icon from '@/Components/Icon';
import Badge, { BadgeTone } from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card, { CardContent, CardHeader } from '@/Components/ui/Card';
import Modal from '@/Components/Modal';
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
                            className="rounded-md border border-border bg-card p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition shadow-xs"
                            title="Back to Orders List"
                        >
                            <Icon name="chevron-left" className="h-4 w-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-mono text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                    {order.order_number}
                                </h1>
                                <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
                                    {order.status}
                                </Badge>
                                {order.table_name && (
                                    <span className="rounded-md bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                                        {order.table_name}
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
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
                        <Link href={route('orders.receipt', order.id)}>
                            <Button variant="outline" size="sm">
                                🖨 Receipt
                            </Button>
                        </Link>

                        {canSettle && (
                            <Button
                                size="sm"
                                onClick={() => setShowSettle(true)}
                                icon={<Icon name="wallet" className="h-4 w-4" />}
                            >
                                Settle Order ({money(order.total, order.currency)})
                            </Button>
                        )}

                        {canVoid && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => setShowVoid(true)}
                                icon={<Icon name="trash" className="h-4 w-4" />}
                            >
                                Void Order
                            </Button>
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
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <Icon name="check" className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs sm:text-sm font-medium text-destructive">
                            <Icon name="alert" className="h-4 w-4 text-destructive shrink-0" />
                            <span>{flash.error}</span>
                        </div>
                    )}

                    {/* Fulfillment & Kitchen Progression Status Bar */}
                    <Card>
                        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                                    <span className="text-xs font-medium text-muted-foreground">Advance to:</span>
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
                        </CardContent>
                    </Card>

                    {/* Main Content Grid: 2 Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* LEFT COLUMN: Items Breakdown & Audit History */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Line Items Card */}
                            <Card>
                                <div className="border-b border-border bg-muted/30 px-5 py-3.5 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Ordered Items ({order.items.length})
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                        <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            <tr>
                                                <th className="px-5 py-3">Item Description</th>
                                                <th className="px-5 py-3 text-right">Qty</th>
                                                <th className="px-5 py-3 text-right">Unit Price</th>
                                                <th className="px-5 py-3 text-right">Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {order.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-semibold text-foreground">
                                                            {item.name}
                                                        </div>
                                                        {item.notes && (
                                                            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-400 bg-amber-500/15 rounded px-2 py-0.5 border border-amber-500/25 w-fit">
                                                                <span>Kitchen Note:</span>
                                                                <span className="italic">{item.notes}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-foreground">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs text-muted-foreground">
                                                        {money(item.unit_price, order.currency)}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-foreground">
                                                        {money(item.line_total, order.currency)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {/* Customer Notes */}
                            {order.notes && (
                                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                                        Special Order Instructions
                                    </h4>
                                    <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                                        {order.notes}
                                    </p>
                                </div>
                            )}

                            {/* Audit & Status History Timeline */}
                            <Card>
                                <CardHeader
                                    title="Audit & Lifecycle Timeline"
                                />
                                <CardContent>
                                    {order.history.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No lifecycle events recorded.</p>
                                    ) : (
                                        <div className="relative pl-4 border-l-2 border-border space-y-3">
                                            {order.history.map((entry, idx) => (
                                                <div key={idx} className="relative text-xs">
                                                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background shadow-xs" />
                                                    <div className="font-semibold text-foreground">
                                                        {entry.note}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                                        {entry.user ? `${entry.user} · ` : ''}
                                                        {entry.at ? new Date(entry.at).toLocaleString() : '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Financial Summary, Payments & Destination */}
                        <div className="space-y-6">
                            {/* Financial Summary Card */}
                            <Card>
                                <CardHeader
                                    title="Financial Reconciliation"
                                />
                                <CardContent>
                                    <dl className="space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between text-muted-foreground">
                                            <dt>Subtotal</dt>
                                            <dd className="font-mono font-medium text-foreground">{money(order.subtotal, order.currency)}</dd>
                                        </div>

                                        {order.discount_total > 0 && (
                                            <div className="flex justify-between text-destructive font-semibold">
                                                <dt>Discount</dt>
                                                <dd className="font-mono">−{money(order.discount_total, order.currency)}</dd>
                                            </div>
                                        )}

                                        {order.tax_total > 0 && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <dt>Tax</dt>
                                                <dd className="font-mono font-medium text-foreground">{money(order.tax_total, order.currency)}</dd>
                                            </div>
                                        )}

                                        {order.service_charge > 0 && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <dt>Service Charge</dt>
                                                <dd className="font-mono font-medium text-foreground">{money(order.service_charge, order.currency)}</dd>
                                            </div>
                                        )}

                                        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                                            <dt>Total Amount</dt>
                                            <dd className="font-mono text-lg font-bold tracking-tight">{money(order.total, order.currency)}</dd>
                                        </div>

                                        <div className="flex justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                                            <dt>Total Paid</dt>
                                            <dd className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{money(order.paid_total, order.currency)}</dd>
                                        </div>

                                        {order.change_due > 0 && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <dt>Change Due / Returned</dt>
                                                <dd className="font-mono font-semibold text-foreground">{money(order.change_due, order.currency)}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    {/* Settle Callout if Held */}
                                    {order.is_open && canSettle && (
                                        <div className="mt-4 pt-3 border-t border-border">
                                            <Button
                                                className="w-full justify-center"
                                                onClick={() => setShowSettle(true)}
                                            >
                                                Settle Balance ({money(order.total, order.currency)})
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Recorded Payments Card */}
                            <Card>
                                <CardHeader
                                    title={`Payments Tendered (${order.payments.length})`}
                                />
                                <CardContent>
                                    {order.payments.length === 0 ? (
                                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-800 dark:text-amber-400">
                                            No payments recorded yet. Order is held.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {order.payments.map((p, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5 text-xs"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="wallet" className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-semibold text-foreground">{p.method}</div>
                                                            <span className="text-[10px] text-muted-foreground capitalize">
                                                                {p.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="font-mono text-xs font-semibold text-foreground">
                                                        {money(p.amount, order.currency)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Customer & Destination Context Card */}
                            <Card>
                                <CardHeader
                                    title="Channel & Table"
                                />
                                <CardContent className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Channel</span>
                                        <span className="font-semibold text-foreground">{order.order_type_label}</span>
                                    </div>
                                    {order.table_name && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Dine-In Table</span>
                                            <span className="font-semibold text-amber-800 dark:text-amber-400">{order.table_name}</span>
                                        </div>
                                    )}
                                    {order.customer_name && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Customer</span>
                                            <span className="font-semibold text-foreground">{order.customer_name}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Branch</span>
                                        <span className="font-medium text-foreground">{order.branch_name ?? '—'}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SETTLE MODAL --- */}
            {showSettle && (
                <Modal show={true} onClose={() => setShowSettle(false)} maxWidth="md">
                    <div className="p-6">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-base font-semibold text-foreground">Settle Order Balance</h3>
                            <button
                                type="button"
                                onClick={() => setShowSettle(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Amount Due Card */}
                        <div className="mt-4 rounded-lg bg-muted/40 border border-border p-4 text-center">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Due
                            </span>
                            <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                                {money(order.total, order.currency)}
                            </div>
                        </div>

                        {/* Method Selector */}
                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Payment Method
                                </label>
                                <select
                                    aria-label="Payment Method"
                                    value={settleMethodId}
                                    onChange={(e) => setSettleMethodId(Number(e.target.value))}
                                    className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
                                    <div>
                                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                                            Cash Received
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={order.total}
                                            value={settleTendered}
                                            onChange={(e) => setSettleTendered(Number(e.target.value))}
                                            className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-3 font-mono text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                    </div>

                                    {/* Preset Chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {cashPresets.map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setSettleTendered(amt)}
                                                className={`rounded-md px-2 py-0.5 text-xs font-mono font-semibold transition ${
                                                    settleTendered === amt
                                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                                        : 'bg-background border border-border text-foreground hover:bg-muted'
                                                }`}
                                            >
                                                {amt === order.total ? 'Exact ' : ''}
                                                {money(amt, order.currency)}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-baseline justify-between border-t border-border pt-2 text-xs text-emerald-700 dark:text-emerald-400">
                                        <span className="font-semibold">Change Due:</span>
                                        <span className="font-mono text-base font-bold">
                                            {money(settleChange, order.currency)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-foreground block mb-1">
                                    Manager PIN (if required)
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter PIN if authorized"
                                    value={settleManagerPin}
                                    onChange={(e) => setSettleManagerPin(e.target.value)}
                                    className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowSettle(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSettleSubmit}
                                loading={settleForm.processing}
                            >
                                Complete Payment
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* --- VOID MODAL --- */}
            {showVoid && (
                <Modal show={true} onClose={() => setShowVoid(false)} maxWidth="md">
                    <div className="p-6">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2 text-destructive">
                                <Icon name="alert" className="h-5 w-5" />
                                <h3 className="text-base font-semibold text-foreground">Void Order {order.order_number}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowVoid(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive space-y-1">
                            <p className="font-semibold">⚠️ Irreversible Action:</p>
                            <p>Voiding this sale reverses inventory stock movements, marks payments as refunded, and audits the cancellation. A manager PIN is required.</p>
                        </div>

                        <div className="mt-4">
                            <label className="text-xs font-semibold text-foreground block mb-1">
                                Manager PIN
                            </label>
                            <input
                                type="password"
                                placeholder="Enter Manager PIN"
                                value={voidForm.data.manager_pin}
                                onChange={(e) => voidForm.setData('manager_pin', e.target.value)}
                                className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-3 text-xs font-mono tracking-widest text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {Object.values(voidForm.errors)[0] && (
                                <p className="mt-1 text-xs text-destructive font-medium">
                                    {Object.values(voidForm.errors)[0]}
                                </p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowVoid(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                    voidForm.post(route('orders.void', order.id), {
                                        onSuccess: () => setShowVoid(false),
                                    })
                                }
                                loading={voidForm.processing}
                                disabled={!voidForm.data.manager_pin}
                            >
                                Confirm Void Order
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </AuthenticatedLayout>
    );
}
