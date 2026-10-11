import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface OrderRow {
    id: number;
    order_number: string;
    order_type: string;
    order_type_label: string;
    status: string;
    branch_name: string | null;
    cashier_name: string | null;
    items_count: number;
    total: number;
    currency: string;
    placed_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

export default function OrdersIndex({
    orders,
    filters,
    statuses,
    types,
}: {
    orders: Paginated<OrderRow>;
    filters: { from: string; to: string; status: string | null; order_type: string | null };
    statuses: { value: string; label: string }[];
    types: { value: string; label: string }[];
}) {
    const { flash } = usePage().props;
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const apply = (params: Record<string, unknown>) =>
        router.get(
            route('orders.index'),
            { from, to, status: filters.status, order_type: filters.order_type, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const statusColor = (status: string) =>
        status === 'completed'
            ? 'bg-green-100 text-green-800'
            : status === 'voided'
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-200 text-gray-700';

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">Orders</h2>
            }
        >
            <Head title="Orders" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-end gap-3">
                            <div>
                                <label className="text-xs text-gray-500">From</label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="block rounded-md border-gray-300 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">To</label>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="block rounded-md border-gray-300 text-sm"
                                />
                            </div>
                            <select
                                value={filters.status ?? ''}
                                onChange={(e) => apply({ status: e.target.value || null })}
                                className="rounded-md border-gray-300 text-sm"
                            >
                                <option value="">All statuses</option>
                                {statuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filters.order_type ?? ''}
                                onChange={(e) => apply({ order_type: e.target.value || null })}
                                className="rounded-md border-gray-300 text-sm"
                            >
                                <option value="">All types</option>
                                {types.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => apply({})}
                                className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                            >
                                Apply
                            </button>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Order</th>
                                    <th className="py-2">Type</th>
                                    <th className="py-2">Branch</th>
                                    <th className="py-2">Cashier</th>
                                    <th className="py-2 text-right">Items</th>
                                    <th className="py-2 text-right">Total</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Placed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.data.map((order) => (
                                    <tr key={order.id}>
                                        <td className="py-3">
                                            <Link
                                                href={route('orders.show', order.id)}
                                                className="font-medium text-indigo-600 hover:text-indigo-700"
                                            >
                                                {order.order_number}
                                            </Link>
                                        </td>
                                        <td className="py-3 text-gray-600">{order.order_type_label}</td>
                                        <td className="py-3 text-gray-600">{order.branch_name}</td>
                                        <td className="py-3 text-gray-600">{order.cashier_name}</td>
                                        <td className="py-3 text-right text-gray-600">{order.items_count}</td>
                                        <td className="py-3 text-right font-medium text-gray-800">
                                            {order.total.toFixed(2)}
                                        </td>
                                        <td className="py-3">
                                            <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + statusColor(order.status)}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500">
                                            {order.placed_at ? new Date(order.placed_at).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {orders.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-500">
                                            No orders in this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {orders.links.length > 3 && (
                            <div className="mt-4 flex flex-wrap gap-1">
                                {orders.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            preserveScroll
                                            className={
                                                'rounded px-3 py-1 text-sm ' +
                                                (link.active ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100')
                                            }
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="px-3 py-1 text-sm text-gray-400"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
