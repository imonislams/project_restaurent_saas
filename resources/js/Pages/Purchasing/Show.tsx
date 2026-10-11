import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

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
    receipts: { id: number; number: string; received_at: string | null; items: { quantity: number; rejected_quantity: number }[] }[];
    payments: { amount: number; method: string; reference: string | null; paid_at: string | null; by: string | null }[];
}

export default function PurchasingShow({ order }: { order: OrderView }) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('purchasing.manage');
    const canApprove = auth.permissions.includes('purchasing.approve');

    const [receiveLines, setReceiveLines] = useState(
        order.items.map((i) => ({ purchase_order_item_id: i.id, quantity: i.outstanding })),
    );
    const [managerPin, setManagerPin] = useState('');
    const paymentForm = useForm({ amount: order.outstanding, method: 'cash', reference: '' });

    const post = (routeName: string, data: Record<string, any> = {}) =>
        router.post(route(routeName, order.id), data, { preserveScroll: true });

    const receive = () =>
        post('purchasing.orders.receive', {
            lines: receiveLines.filter((l) => l.quantity > 0),
        });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">{order.number}</h2>
                        <p className="text-sm text-gray-500">
                            {order.supplier} · {order.branch} · <span className="capitalize">{order.status_label}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('purchasing.orders.index')} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            Back
                        </Link>
                        {canManage && order.is_submittable && (
                            <button onClick={() => post('purchasing.orders.submit')} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                Submit
                            </button>
                        )}
                        {canApprove && order.is_approvable && (
                            <button
                                onClick={() => post('purchasing.orders.approve', { manager_pin: managerPin || null })}
                                className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                                Approve
                            </button>
                        )}
                        {canManage && order.status !== 'received' && order.status !== 'cancelled' && (
                            <button onClick={() => post('purchasing.orders.cancel')} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Purchase order ${order.number}`} />

            <div className="py-8">
                <div className="mx-auto max-w-5xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    {canApprove && order.is_approvable && (
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                            <label className="text-sm text-gray-700">Manager PIN (required above the approval limit)</label>
                            <input
                                type="password"
                                className="mt-1 block w-full max-w-xs rounded-md border-gray-300"
                                value={managerPin}
                                onChange={(e) => setManagerPin(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-3 text-base font-semibold text-gray-900">Items</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Item</th>
                                    <th className="py-2 text-right">Ordered</th>
                                    <th className="py-2 text-right">Received</th>
                                    <th className="py-2 text-right">Outstanding</th>
                                    <th className="py-2 text-right">Unit</th>
                                    <th className="py-2 text-right">Line</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-2 text-gray-800">{item.description}</td>
                                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                                        <td className="py-2 text-right text-gray-600">{item.received_quantity}</td>
                                        <td className="py-2 text-right text-gray-600">{item.outstanding}</td>
                                        <td className="py-2 text-right text-gray-600">{item.unit_cost.toFixed(2)}</td>
                                        <td className="py-2 text-right text-gray-800">{item.line_total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-3 text-right text-sm">
                            <div className="text-gray-500">Total: <span className="font-medium text-gray-800">{order.total.toFixed(2)}</span></div>
                            <div className="text-gray-500">Paid: <span className="font-medium text-gray-800">{order.paid_total.toFixed(2)}</span></div>
                            <div className="text-gray-500">Outstanding: <span className="font-medium text-red-600">{order.outstanding.toFixed(2)}</span></div>
                        </div>
                    </div>

                    {canManage && order.is_receivable && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Receive goods</h3>
                            <div className="space-y-2">
                                {order.items.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-3 text-sm">
                                        <span className="flex-1 text-gray-700">{item.description}</span>
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="w-28 rounded-md border-gray-300"
                                            value={receiveLines[index]?.quantity ?? 0}
                                            onChange={(e) => {
                                                const next = [...receiveLines];
                                                next[index] = { ...next[index], quantity: Number(e.target.value) };
                                                setReceiveLines(next);
                                            }}
                                        />
                                        <span className="text-xs text-gray-400">of {item.outstanding}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={receive} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                    Confirm receipt
                                </button>
                            </div>
                        </div>
                    )}

                    {order.receipts.length > 0 && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Goods receipts</h3>
                            <ul className="space-y-1 text-sm text-gray-600">
                                {order.receipts.map((r) => (
                                    <li key={r.id} className="flex justify-between">
                                        <span>{r.number}</span>
                                        <span>{r.received_at ? new Date(r.received_at).toLocaleString() : ''}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Supplier payments</h3>
                            <ul className="mb-4 space-y-1 text-sm text-gray-600">
                                {order.payments.map((p, i) => (
                                    <li key={i} className="flex justify-between">
                                        <span>{p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                                        <span>{p.amount.toFixed(2)}</span>
                                    </li>
                                ))}
                                {order.payments.length === 0 && <li className="text-gray-400">No payments recorded.</li>}
                            </ul>
                            <div className="flex flex-wrap items-end gap-2">
                                <div>
                                    <label className="text-xs text-gray-500">Amount</label>
                                    <input type="number" step="0.01" className="block w-32 rounded-md border-gray-300 text-sm" value={paymentForm.data.amount} onChange={(e) => paymentForm.setData('amount', Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Method</label>
                                    <input className="block w-32 rounded-md border-gray-300 text-sm" value={paymentForm.data.method} onChange={(e) => paymentForm.setData('method', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Reference</label>
                                    <input className="block w-40 rounded-md border-gray-300 text-sm" value={paymentForm.data.reference} onChange={(e) => paymentForm.setData('reference', e.target.value)} />
                                </div>
                                <button
                                    onClick={() => paymentForm.post(route('purchasing.orders.pay', order.id), { preserveScroll: true })}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                >
                                    Record payment
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
