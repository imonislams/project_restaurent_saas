import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
    ConfirmDialog,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface OrderView {
    id: number;
    number: string;
    status: string;
    status_label: string;
    supplier: string | null;
    branch: string | null;
    notes: string | null;
    subtotal: number;
    total: number;
    paid_total: number;
    outstanding: number;
    is_submittable: boolean;
    is_approvable: boolean;
    is_receivable: boolean;
    items: {
        id: number;
        description: string;
        quantity: number;
        received_quantity: number;
        outstanding: number;
        unit_cost: number;
        line_total: number;
    }[];
    receipts: {
        id: number;
        number: string;
        received_at: string | null;
        items: { quantity: number; rejected_quantity: number }[];
    }[];
    payments: {
        amount: number;
        method: string;
        reference: string | null;
        paid_at: string | null;
        by: string | null;
    }[];
}

const STATUS_TONE: Record<string, BadgeTone> = {
    received: 'success',
    approved: 'info',
    cancelled: 'danger',
    submitted: 'warning',
    draft: 'neutral',
};

export default function PurchasingShow({ order }: { order: OrderView }) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('purchasing.manage');
    const canApprove = auth.permissions.includes('purchasing.approve');

    const [receiveLines, setReceiveLines] = useState(
        order.items.map((i) => ({
            purchase_order_item_id: i.id,
            quantity: i.outstanding,
        }))
    );
    const [managerPin, setManagerPin] = useState('');

    const [confirmAction, setConfirmAction] = useState<{
        open: boolean;
        title: string;
        message: string;
        tone: 'danger' | 'primary';
        confirmLabel: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', tone: 'primary', confirmLabel: 'Confirm', onConfirm: () => {} });

    // Payment Form
    const paymentForm = useForm({
        amount: order.outstanding,
        method: 'bank_transfer',
        reference: '',
    });

    const post = (routeName: string, data: Record<string, any> = {}) =>
        router.post(route(routeName, order.id), data, { preserveScroll: true });

    const handleReceive = () => {
        post('purchasing.orders.receive', {
            lines: receiveLines.filter((l) => l.quantity > 0),
        });
    };

    const fillAllOutstanding = () => {
        setReceiveLines(
            order.items.map((i) => ({
                purchase_order_item_id: i.id,
                quantity: i.outstanding,
            }))
        );
    };

    const clearReceive = () => {
        setReceiveLines(
            order.items.map((i) => ({
                purchase_order_item_id: i.id,
                quantity: 0,
            }))
        );
    };

    const handleCancelOrder = () => {
        setConfirmAction({
            open: true,
            title: `Cancel Purchase Order ${order.number}?`,
            message: `Are you sure you want to cancel this order? This will discard remaining receivable items.`,
            tone: 'danger',
            confirmLabel: 'Cancel Purchase Order',
            onConfirm: () => {
                post('purchasing.orders.cancel');
                setConfirmAction((prev) => ({ ...prev, open: false }));
            },
        });
    };

    const submitPayment = () => {
        paymentForm.post(route('purchasing.orders.pay', order.id), {
            preserveScroll: true,
            onSuccess: () => paymentForm.reset('reference'),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('purchasing.orders.index')}
                                className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900"
                            >
                                ← Back to PO List
                            </Link>
                            <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
                                {order.status_label}
                            </Badge>
                        </div>
                        <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-gray-900">
                            {order.number}
                        </h1>
                        <p className="text-xs text-gray-500">
                            Vendor: <span className="font-semibold text-gray-800">{order.supplier}</span> · Target Branch: <span className="font-semibold text-gray-800">{order.branch}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canManage && order.is_submittable && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => post('purchasing.orders.submit')}
                            >
                                Submit Order for Approval
                            </Button>
                        )}

                        {canApprove && order.is_approvable && (
                            <Button
                                variant="success"
                                size="sm"
                                onClick={() =>
                                    post('purchasing.orders.approve', {
                                        manager_pin: managerPin || null,
                                    })
                                }
                            >
                                Approve Order
                            </Button>
                        )}

                        {canManage &&
                            order.status !== 'received' &&
                            order.status !== 'cancelled' && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="text-rose-600 hover:text-rose-700"
                                    onClick={handleCancelOrder}
                                >
                                    Cancel Order
                                </Button>
                            )}
                    </div>
                </div>
            }
        >
            <Head title={`PO ${order.number} Details`} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    {/* Manager PIN for high-value approval */}
                    {canApprove && order.is_approvable && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-semibold text-amber-950">
                                        Manager Authorization Required
                                    </h4>
                                    <p className="mt-0.5 text-amber-800">
                                        If this order amount exceeds your standard tenant approval threshold, enter your Manager PIN to sign off.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="password"
                                        placeholder="Manager PIN"
                                        value={managerPin}
                                        onChange={(e) => setManagerPin(e.target.value)}
                                        className="h-9 w-36 rounded-md border-amber-300 font-mono text-xs shadow-sm focus:border-amber-500 focus:ring-amber-500"
                                    />
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() =>
                                            post('purchasing.orders.approve', {
                                                manager_pin: managerPin || null,
                                            })
                                        }
                                    >
                                        Authorize & Approve
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial Summary KPI Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Total Order Amount"
                            value={`$${order.total.toFixed(2)}`}
                            hint={`Subtotal: $${order.subtotal.toFixed(2)}`}
                        />
                        <KpiCard
                            label="Paid to Vendor"
                            value={`$${order.paid_total.toFixed(2)}`}
                            tone="success"
                            hint={`${order.payments.length} recorded payments`}
                        />
                        <KpiCard
                            label="Outstanding Due"
                            value={`$${order.outstanding.toFixed(2)}`}
                            tone={order.outstanding > 0 ? 'warning' : 'neutral'}
                            hint={order.outstanding > 0 ? 'Pending payment' : 'Fully settled'}
                        />
                        <KpiCard
                            label="Line Items Count"
                            value={order.items.length}
                            hint={`${order.receipts.length} partial receipts logged`}
                        />
                    </div>

                    {/* Order Items Table */}
                    <Card>
                        <CardHeader
                            title="Ordered Items & Delivery Status"
                            description="Breakdown of quantities, unit costs, and received progress."
                        />
                        <CardBody className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3.5">Item Description</th>
                                            <th className="px-6 py-3.5 text-right">Ordered Qty</th>
                                            <th className="px-6 py-3.5 text-right">Received Qty</th>
                                            <th className="px-6 py-3.5 text-right">Outstanding</th>
                                            <th className="px-6 py-3.5 text-right">Agreed Unit Cost</th>
                                            <th className="px-6 py-3.5 text-right">Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {order.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {item.description}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono tabular-nums text-gray-600">
                                                    {item.quantity.toFixed(3)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-medium tabular-nums text-emerald-700">
                                                    {item.received_quantity.toFixed(3)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span
                                                        className={`font-mono tabular-nums font-semibold ${
                                                            item.outstanding > 0
                                                                ? 'text-amber-600'
                                                                : 'text-gray-400'
                                                        }`}
                                                    >
                                                        {item.outstanding.toFixed(3)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono tabular-nums text-gray-600">
                                                    ${item.unit_cost.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold tabular-nums text-gray-900">
                                                    ${item.line_total.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>

                    {/* RECEIVE GOODS PANEL */}
                    {canManage && order.is_receivable && (
                        <Card>
                            <CardHeader
                                title="Goods Receipt Check-In"
                                description="Record items physically delivered by the supplier. Stock on hand will be updated immediately upon confirmation."
                                action={
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={fillAllOutstanding}
                                            className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                        >
                                            Receive All Outstanding
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearReceive}
                                            className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                                        >
                                            Clear Quantities
                                        </button>
                                    </div>
                                }
                            />
                            <CardBody>
                                <div className="space-y-3">
                                    {order.items.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-xs"
                                        >
                                            <div className="flex-1">
                                                <span className="font-semibold text-gray-900 text-sm">
                                                    {item.description}
                                                </span>
                                                <span className="block text-gray-500 mt-0.5">
                                                    Already received: {item.received_quantity.toFixed(3)} of {item.quantity.toFixed(3)} ordered
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="text-gray-600 font-medium">
                                                    Receiving now:
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    min="0"
                                                    max={item.outstanding}
                                                    value={receiveLines[index]?.quantity ?? 0}
                                                    onChange={(e) => {
                                                        const next = [...receiveLines];
                                                        next[index] = {
                                                            ...next[index],
                                                            quantity: Number(e.target.value),
                                                        };
                                                        setReceiveLines(next);
                                                    }}
                                                    className="h-9 w-28 rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                                <span className="text-gray-400">
                                                    / {item.outstanding.toFixed(3)} max
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleReceive}
                                    >
                                        Confirm & Post Goods Receipt
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    {/* GOODS RECEIPTS AUDIT HISTORY */}
                    {order.receipts.length > 0 && (
                        <Card>
                            <CardHeader
                                title="Goods Receipt History"
                                description="Audit log of previous delivery check-ins against this order."
                            />
                            <CardBody className="p-0">
                                <ul className="divide-y divide-gray-100 text-xs">
                                    {order.receipts.map((r) => (
                                        <li
                                            key={r.id}
                                            className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50"
                                        >
                                            <span className="font-mono font-semibold text-indigo-700">
                                                {r.number}
                                            </span>
                                            <span className="text-gray-500">
                                                {r.received_at
                                                    ? new Date(r.received_at).toLocaleString()
                                                    : '—'}
                                            </span>
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-medium text-emerald-800">
                                                Goods Checked In
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardBody>
                        </Card>
                    )}

                    {/* SUPPLIER PAYMENTS & SETTLEMENT */}
                    {canManage && (
                        <Card>
                            <CardHeader
                                title="Supplier Payments & Settlement"
                                description="Record accounts payable disbursements against this purchase order."
                            />
                            <CardBody>
                                {order.payments.length > 0 ? (
                                    <div className="mb-5 overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                                                <tr>
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Payment Method</th>
                                                    <th className="px-4 py-2">Reference</th>
                                                    <th className="px-4 py-2 text-right">Amount</th>
                                                    <th className="px-4 py-2">Recorded By</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {order.payments.map((p, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-2.5 text-gray-500">
                                                            {p.paid_at
                                                                ? new Date(p.paid_at).toLocaleDateString()
                                                                : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-medium capitalize text-gray-900">
                                                            {p.method.replace('_', ' ')}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-gray-600">
                                                            {p.reference ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                                                            ${p.amount.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-500">
                                                            {p.by ?? 'System'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="mb-4 text-xs text-gray-400">
                                        No payments recorded against this purchase order yet.
                                    </p>
                                )}

                                {order.outstanding > 0 && (
                                    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                                        <h4 className="text-xs font-semibold text-gray-900 mb-3">
                                            Record Payment / Disbursement
                                        </h4>
                                        <div className="flex flex-wrap items-end gap-3 text-xs">
                                            <div>
                                                <label className="block text-gray-700 font-medium mb-1">
                                                    Payment Amount ($)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={paymentForm.data.amount}
                                                    onChange={(e) =>
                                                        paymentForm.setData('amount', Number(e.target.value))
                                                    }
                                                    className="h-9 w-32 rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-gray-700 font-medium mb-1">
                                                    Method
                                                </label>
                                                <select
                                                    value={paymentForm.data.method}
                                                    onChange={(e) =>
                                                        paymentForm.setData('method', e.target.value)
                                                    }
                                                    className="h-9 w-36 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                >
                                                    <option value="bank_transfer">Bank Transfer</option>
                                                    <option value="cash">Cash</option>
                                                    <option value="check">Company Check</option>
                                                    <option value="card">Card / Electronic</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-gray-700 font-medium mb-1">
                                                    Transaction Reference
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. TXN-99482 / Check #104"
                                                    value={paymentForm.data.reference}
                                                    onChange={(e) =>
                                                        paymentForm.setData('reference', e.target.value)
                                                    }
                                                    className="h-9 w-44 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={submitPayment}
                                                loading={paymentForm.processing}
                                            >
                                                Post Payment
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            {/* CONFIRM ACTION DIALOG */}
            <ConfirmDialog
                show={confirmAction.open}
                title={confirmAction.title}
                description={confirmAction.message}
                tone={confirmAction.tone}
                confirmLabel={confirmAction.confirmLabel}
                onConfirm={confirmAction.onConfirm}
                onClose={() => setConfirmAction((prev) => ({ ...prev, open: false }))}
            />
        </AuthenticatedLayout>
    );
}
