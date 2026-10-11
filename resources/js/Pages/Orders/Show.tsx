import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

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
    items: { name: string; quantity: number; unit_price: number; line_total: number; notes: string | null }[];
    payments: { method: string; amount: number; status: string }[];
    history: { note: string | null; user: string | null; at: string | null }[];
}

export default function OrderShow({
    order,
    nextFulfillment,
    paymentMethods,
}: {
    order: OrderDetail;
    nextFulfillment: { value: string; label: string }[];
    paymentMethods: { id: number; name: string; type: string }[];
}) {
    const { auth, flash } = usePage().props;
    const canVoid = auth.permissions.includes('orders.void') && order.can_void;
    const canFulfill = auth.permissions.includes('orders.update');
    const canSettle = auth.permissions.includes('pos.use') && order.is_open;

    const [showVoid, setShowVoid] = useState(false);
    const [showSettle, setShowSettle] = useState(false);

    const voidForm = useForm({ manager_pin: '' });
    const settleForm = useForm({
        payments: [{ payment_method_id: paymentMethods[0]?.id ?? ('' as number | ''), amount: order.total, tendered: order.total }],
        manager_pin: '',
    });

    const settle = () => {
        settleForm.post(route('orders.settle', order.id), {
            onSuccess: () => setShowSettle(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">{order.order_number}</h2>
                        <p className="text-sm text-gray-500">
                            {order.order_type_label}
                            {order.table_name && ` · Table ${order.table_name}`}
                            {order.covers && ` · ${order.covers} covers`}
                            {` · ${order.branch_name} · ${order.cashier_name}`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('orders.receipt', order.id)}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Receipt
                        </Link>
                        {canSettle && (
                            <button
                                onClick={() => setShowSettle(true)}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                Settle order
                            </button>
                        )}
                        {canVoid && (
                            <button
                                onClick={() => setShowVoid(true)}
                                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                Void order
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Order ${order.order_number}`} />

            <div className="py-8">
                <div className="mx-auto max-w-4xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow-sm">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                            {order.status}
                        </span>
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                            Fulfillment: {order.fulfillment_label}
                        </span>
                        {order.kitchen_status && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                Kitchen: {order.kitchen_status}
                            </span>
                        )}
                        {canFulfill && nextFulfillment.length > 0 && (
                            <div className="ml-auto flex gap-2">
                                {nextFulfillment.map((s) => (
                                    <button
                                        key={s.value}
                                        onClick={() =>
                                            router.patch(
                                                route('orders.fulfillment', order.id),
                                                { fulfillment_status: s.value },
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="rounded-md border border-indigo-300 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                                    >
                                        Mark {s.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Item</th>
                                    <th className="py-2 text-right">Qty</th>
                                    <th className="py-2 text-right">Unit</th>
                                    <th className="py-2 text-right">Line</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-2 text-gray-800">{item.name}</td>
                                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                                        <td className="py-2 text-right text-gray-600">{item.unit_price.toFixed(2)}</td>
                                        <td className="py-2 text-right text-gray-800">{item.line_total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Subtotal</dt>
                                <dd>{order.subtotal.toFixed(2)}</dd>
                            </div>
                            {order.discount_total > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <dt>Discount</dt>
                                    <dd>−{order.discount_total.toFixed(2)}</dd>
                                </div>
                            )}
                            {order.tax_total > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Tax</dt>
                                    <dd>{order.tax_total.toFixed(2)}</dd>
                                </div>
                            )}
                            {order.service_charge > 0 && (
                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Service</dt>
                                    <dd>{order.service_charge.toFixed(2)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-100 pt-1 text-base font-semibold">
                                <dt>Total</dt>
                                <dd>{order.total.toFixed(2)}</dd>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <dt>Paid</dt>
                                <dd>{order.paid_total.toFixed(2)}</dd>
                            </div>
                            {order.change_due > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <dt>Change</dt>
                                    <dd>{order.change_due.toFixed(2)}</dd>
                                </div>
                            )}
                        </dl>

                        {order.payments.length > 0 && (
                            <div className="mt-6 border-t border-gray-100 pt-4">
                                <h3 className="mb-2 text-sm font-semibold text-gray-700">Payments</h3>
                                <ul className="space-y-1 text-sm">
                                    {order.payments.map((p, i) => (
                                        <li key={i} className="flex justify-between text-gray-600">
                                            <span>
                                                {p.method} <span className="text-xs text-gray-400">({p.status})</span>
                                            </span>
                                            <span>{p.amount.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {order.history.length > 0 && (
                            <div className="mt-6 border-t border-gray-100 pt-4">
                                <h3 className="mb-2 text-sm font-semibold text-gray-700">History</h3>
                                <ul className="space-y-1 text-xs text-gray-500">
                                    {order.history.map((h, i) => (
                                        <li key={i}>
                                            {h.note} {h.user && `· ${h.user}`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showSettle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900">Settle order</h3>
                        <p className="mt-1 text-sm text-gray-500">Total due {order.total.toFixed(2)}</p>

                        <div className="mt-3 space-y-3">
                            <select
                                className="block w-full rounded-md border-gray-300"
                                value={settleForm.data.payments[0].payment_method_id}
                                onChange={(e) =>
                                    settleForm.setData('payments', [
                                        { ...settleForm.data.payments[0], payment_method_id: Number(e.target.value) },
                                    ])
                                }
                            >
                                {paymentMethods.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                            <div>
                                <label className="text-xs text-gray-500">Cash received</label>
                                <input
                                    type="number"
                                    className="block w-full rounded-md border-gray-300"
                                    value={settleForm.data.payments[0].tendered}
                                    onChange={(e) =>
                                        settleForm.setData('payments', [
                                            { ...settleForm.data.payments[0], tendered: Number(e.target.value) },
                                        ])
                                    }
                                />
                            </div>
                        </div>

                        {Object.values(settleForm.errors)[0] && (
                            <p className="mt-2 text-sm text-red-600">{Object.values(settleForm.errors)[0]}</p>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setShowSettle(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={settle}
                                disabled={settleForm.processing}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Complete payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVoid && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900">Void order</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Voiding reverses stock and marks payments as refunded. A manager PIN is required.
                        </p>
                        <input
                            type="password"
                            placeholder="Manager PIN"
                            className="mt-3 block w-full rounded-md border-gray-300"
                            value={voidForm.data.manager_pin}
                            onChange={(e) => voidForm.setData('manager_pin', e.target.value)}
                        />
                        {Object.values(voidForm.errors)[0] && (
                            <p className="mt-1 text-sm text-red-600">{Object.values(voidForm.errors)[0]}</p>
                        )}
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setShowVoid(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() =>
                                    voidForm.post(route('orders.void', order.id), {
                                        onSuccess: () => setShowVoid(false),
                                    })
                                }
                                disabled={voidForm.processing}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                Confirm void
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
