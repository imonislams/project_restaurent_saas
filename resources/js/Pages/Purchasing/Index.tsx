import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ItemOption {
    value: string;
    label: string;
    type: string;
    id: number;
    cost: number;
}

interface Supplier {
    id: number;
    name: string;
    contact_name: string | null;
    phone: string | null;
    outstanding: number;
    is_active: boolean;
}

interface OrderRow {
    id: number;
    number: string;
    supplier: string | null;
    branch: string | null;
    status: string;
    status_label: string;
    items_count: number;
    total: number;
    is_receivable: boolean;
}

const input =
    'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm';

export default function PurchasingIndex({
    suppliers,
    orders,
    branches,
    items,
}: {
    suppliers: Supplier[];
    orders: OrderRow[];
    branches: { id: number; name: string }[];
    items: ItemOption[];
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('purchasing.manage');

    const [showSupplier, setShowSupplier] = useState(false);
    const [showOrder, setShowOrder] = useState(false);

    const supplierForm = useForm({ name: '', contact_name: '', phone: '', email: '' });
    const orderForm = useForm({
        supplier_id: suppliers[0]?.id ?? ('' as number | ''),
        branch_id: branches[0]?.id ?? ('' as number | ''),
        notes: '',
        items: [{ value: '', quantity: 1, unit_cost: 0 }] as {
            value: string;
            quantity: number;
            unit_cost: number;
        }[],
    });

    const submitSupplier: FormEventHandler = (e) => {
        e.preventDefault();
        supplierForm.post(route('purchasing.suppliers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                supplierForm.reset();
                setShowSupplier(false);
            },
        });
    };

    const submitOrder: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = {
            supplier_id: orderForm.data.supplier_id,
            branch_id: orderForm.data.branch_id,
            notes: orderForm.data.notes,
            items: orderForm.data.items
                .filter((i) => i.value)
                .map((i) => {
                    const [item_type, item_id] = i.value.split(':');
                    return {
                        item_type,
                        item_id: Number(item_id),
                        quantity: i.quantity,
                        unit_cost: i.unit_cost,
                    };
                }),
        };

        orderForm.transform(() => payload);
        orderForm.post(route('purchasing.orders.store'), { preserveScroll: true });
    };

    const statusColor = (status: string) =>
        status === 'received'
            ? 'bg-green-100 text-green-800'
            : status === 'approved'
              ? 'bg-indigo-100 text-indigo-800'
              : status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-200 text-gray-700';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Purchasing &amp; suppliers
                    </h2>
                    {canManage && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSupplier((v) => !v)}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                {showSupplier ? 'Close' : 'Add supplier'}
                            </button>
                            <button
                                onClick={() => setShowOrder((v) => !v)}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                {showOrder ? 'Close' : 'New purchase order'}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <Head title="Purchasing" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>
                    )}

                    {showSupplier && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New supplier</h3>
                            <form onSubmit={submitSupplier} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Name</label>
                                    <input className={'block ' + input} value={supplierForm.data.name} onChange={(e) => supplierForm.setData('name', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Contact</label>
                                    <input className={'block ' + input} value={supplierForm.data.contact_name} onChange={(e) => supplierForm.setData('contact_name', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Phone</label>
                                    <input className={'block ' + input} value={supplierForm.data.phone} onChange={(e) => supplierForm.setData('phone', e.target.value)} />
                                </div>
                                <button type="submit" disabled={supplierForm.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                    Save supplier
                                </button>
                                {supplierForm.errors.name && <p className="text-sm text-red-600">{supplierForm.errors.name}</p>}
                            </form>
                        </div>
                    )}

                    {showOrder && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New purchase order</h3>
                            <form onSubmit={submitOrder} className="space-y-3">
                                <div className="flex flex-wrap gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">Supplier</label>
                                        <select className={'block ' + input} value={orderForm.data.supplier_id} onChange={(e) => orderForm.setData('supplier_id', Number(e.target.value))}>
                                            {suppliers.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Branch</label>
                                        <select className={'block ' + input} value={orderForm.data.branch_id} onChange={(e) => orderForm.setData('branch_id', Number(e.target.value))}>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500">Items</label>
                                    <div className="space-y-2">
                                        {orderForm.data.items.map((row, index) => (
                                            <div key={index} className="flex gap-2">
                                                <select
                                                    className={'flex-1 ' + input}
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        const opt = items.find((i) => i.value === e.target.value);
                                                        const next = [...orderForm.data.items];
                                                        next[index] = { ...row, value: e.target.value, unit_cost: opt?.cost ?? 0 };
                                                        orderForm.setData('items', next);
                                                    }}
                                                >
                                                    <option value="">Select item…</option>
                                                    {items.map((i) => (
                                                        <option key={i.value} value={i.value}>{i.label}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    step="0.001"
                                                    placeholder="Qty"
                                                    className={'w-24 ' + input}
                                                    value={row.quantity}
                                                    onChange={(e) => {
                                                        const next = [...orderForm.data.items];
                                                        next[index] = { ...row, quantity: Number(e.target.value) };
                                                        orderForm.setData('items', next);
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Unit cost"
                                                    className={'w-28 ' + input}
                                                    value={row.unit_cost}
                                                    onChange={(e) => {
                                                        const next = [...orderForm.data.items];
                                                        next[index] = { ...row, unit_cost: Number(e.target.value) };
                                                        orderForm.setData('items', next);
                                                    }}
                                                />
                                                <button type="button" onClick={() => orderForm.setData('items', orderForm.data.items.filter((_, i) => i !== index))} className="text-sm text-red-600">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => orderForm.setData('items', [...orderForm.data.items, { value: '', quantity: 1, unit_cost: 0 }])}
                                        className="mt-2 text-xs text-indigo-600 hover:text-indigo-700"
                                    >
                                        + Add line
                                    </button>
                                </div>

                                {Object.values(orderForm.errors)[0] && (
                                    <p className="text-sm text-red-600">{Object.values(orderForm.errors)[0]}</p>
                                )}

                                <div className="flex justify-end">
                                    <button type="submit" disabled={orderForm.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                        Create order
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Purchase orders</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Number</th>
                                    <th className="py-2">Supplier</th>
                                    <th className="py-2">Branch</th>
                                    <th className="py-2 text-right">Items</th>
                                    <th className="py-2 text-right">Total</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map((o) => (
                                    <tr key={o.id}>
                                        <td className="py-3">
                                            <Link href={route('purchasing.orders.show', o.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                                                {o.number}
                                            </Link>
                                        </td>
                                        <td className="py-3 text-gray-600">{o.supplier}</td>
                                        <td className="py-3 text-gray-600">{o.branch}</td>
                                        <td className="py-3 text-right text-gray-600">{o.items_count}</td>
                                        <td className="py-3 text-right text-gray-800">{o.total.toFixed(2)}</td>
                                        <td className="py-3">
                                            <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + statusColor(o.status)}>{o.status_label}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            {o.is_receivable && canManage && (
                                                <Link href={route('purchasing.orders.show', o.id)} className="text-xs text-indigo-600 hover:text-indigo-700">
                                                    Receive
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-500">No purchase orders yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Suppliers</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Contact</th>
                                    <th className="py-2">Phone</th>
                                    <th className="py-2 text-right">Outstanding</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {suppliers.map((s) => (
                                    <tr key={s.id}>
                                        <td className="py-3 text-gray-800">{s.name}</td>
                                        <td className="py-3 text-gray-600">{s.contact_name}</td>
                                        <td className="py-3 text-gray-600">{s.phone}</td>
                                        <td className={'py-3 text-right ' + (s.outstanding > 0 ? 'text-red-600' : 'text-gray-600')}>
                                            {s.outstanding.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {suppliers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-500">No suppliers yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
