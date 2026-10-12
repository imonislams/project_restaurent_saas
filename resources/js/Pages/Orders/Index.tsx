import Icon from '@/Components/Icon';
import Badge, { BadgeTone } from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

// --- Interfaces ---

interface OrderRow {
    id: number;
    order_number: string;
    order_type: string;
    order_type_label: string;
    source: string;
    source_label: string;
    status: string;
    acceptance_status: string;
    acceptance_label: string;
    fulfillment_status?: string;
    fulfillment_label?: string;
    table_name?: string | null;
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
    total?: number;
    from?: number;
    to?: number;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    completed: 'success',
    paid: 'success',
    settled: 'info',
    held: 'warning',
    open: 'warning',
    draft: 'neutral',
    voided: 'danger',
    cancelled: 'danger',
    refunded: 'neutral',
};

const money = (n: number, currency: string) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };

    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [status, setStatus] = useState(filters.status ?? '');
    const [orderType, setOrderType] = useState(filters.order_type ?? '');
    const [searchQuery, setSearchQuery] = useState('');

    const apply = (overrides: Record<string, unknown> = {}) => {
        router.get(
            route('orders.index'),
            {
                from,
                to,
                status: status || null,
                order_type: orderType || null,
                ...overrides,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Quick Date Presets
    const setDatePreset = (preset: 'today' | 'yesterday' | '7days' | '30days') => {
        const todayDate = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        if (preset === 'today') {
            const todayStr = formatDate(todayDate);
            setFrom(todayStr);
            setTo(todayStr);
            apply({ from: todayStr, to: todayStr });
        } else if (preset === 'yesterday') {
            const yest = new Date(todayDate);
            yest.setDate(yest.getDate() - 1);
            const yestStr = formatDate(yest);
            setFrom(yestStr);
            setTo(yestStr);
            apply({ from: yestStr, to: yestStr });
        } else if (preset === '7days') {
            const past = new Date(todayDate);
            past.setDate(past.getDate() - 7);
            const fromStr = formatDate(past);
            const toStr = formatDate(todayDate);
            setFrom(fromStr);
            setTo(toStr);
            apply({ from: fromStr, to: toStr });
        } else if (preset === '30days') {
            const past = new Date(todayDate);
            past.setDate(past.getDate() - 30);
            const fromStr = formatDate(past);
            const toStr = formatDate(todayDate);
            setFrom(fromStr);
            setTo(toStr);
            apply({ from: fromStr, to: toStr });
        }
    };

    // Computed metrics for current view
    const metrics = useMemo(() => {
        const list = orders.data;
        const totalVolume = list.reduce((sum, o) => sum + (o.total || 0), 0);
        const completedCount = list.filter((o) => o.status === 'completed' || o.status === 'settled').length;
        const openCount = list.filter((o) => o.status === 'held' || o.status === 'open').length;
        const currency = list[0]?.currency ?? '$';

        return {
            totalOrders: list.length,
            completedCount,
            openCount,
            totalVolume,
            currency,
        };
    }, [orders.data]);

    // Client-side quick filter for instant search in current page
    const displayedOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders.data;
        const q = searchQuery.toLowerCase().trim();
        return orders.data.filter(
            (o) =>
                o.order_number.toLowerCase().includes(q) ||
                (o.cashier_name && o.cashier_name.toLowerCase().includes(q)) ||
                (o.table_name && o.table_name.toLowerCase().includes(q)) ||
                (o.branch_name && o.branch_name.toLowerCase().includes(q)),
        );
    }, [orders.data, searchQuery]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
                            Orders Management
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-gray-500">
                            Monitor, filter, settle, and audit sales transactions across all channels.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('pos.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-restrly-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-subtle hover:bg-restrly-700 transition"
                        >
                            <Icon name="cart" className="h-4 w-4" />
                            <span>Open POS</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Orders Management" />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 shadow-subtle">
                            <Icon name="receipt" className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-medium text-red-800 shadow-subtle">
                            <Icon name="alert" className="h-4 w-4 shrink-0 text-red-600" />
                            <span>{flash.error}</span>
                        </div>
                    )}

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Total Orders
                            </span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="font-mono text-2xl font-bold text-gray-900">
                                    {orders.total ?? orders.data.length}
                                </span>
                                <span className="text-xs text-gray-400">in period</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                                Completed Sales
                            </span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="font-mono text-2xl font-bold text-emerald-700">
                                    {metrics.completedCount}
                                </span>
                                <span className="text-xs text-gray-400">settled</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                                Open / Held
                            </span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="font-mono text-2xl font-bold text-amber-700">
                                    {metrics.openCount}
                                </span>
                                <span className="text-xs text-gray-400">pending</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                Net Volume
                            </span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="font-mono text-2xl font-bold text-gray-900">
                                    {money(metrics.totalVolume, metrics.currency)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-subtle space-y-3">
                        {/* Quick Presets Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-1.5 overflow-x-auto">
                                <span className="text-xs font-semibold text-gray-400 mr-1">Period:</span>
                                <button
                                    type="button"
                                    onClick={() => setDatePreset('today')}
                                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-subtle"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDatePreset('yesterday')}
                                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-subtle"
                                >
                                    Yesterday
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDatePreset('7days')}
                                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-subtle"
                                >
                                    Last 7 Days
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDatePreset('30days')}
                                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-subtle"
                                >
                                    Last 30 Days
                                </button>
                            </div>

                            {/* Search Box */}
                            <div className="relative w-full sm:w-64">
                                <Icon
                                    name="search"
                                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Quick filter (Order #, table)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-restrly-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-restrly-500"
                                />
                            </div>
                        </div>

                        {/* Detailed Inputs Row */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 items-end">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-1.5 px-2.5 text-xs text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-1.5 px-2.5 text-xs text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Status
                                </label>
                                <select
                                    aria-label="Order Status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-1.5 px-2.5 text-xs font-medium text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                >
                                    <option value="">All statuses</option>
                                    {statuses.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                                    Order Channel
                                </label>
                                <select
                                    aria-label="Order Channel"
                                    value={orderType}
                                    onChange={(e) => setOrderType(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-1.5 px-2.5 text-xs font-medium text-gray-800 shadow-subtle focus:border-restrly-500 focus:ring-1 focus:ring-restrly-500"
                                >
                                    <option value="">All channels</option>
                                    {types.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                                <Button
                                    size="sm"
                                    className="w-full justify-center"
                                    onClick={() => apply({ status: status || null, order_type: orderType || null })}
                                >
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Orders Data Table */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-subtle overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50/50">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Order Records ({displayedOrders.length} shown)
                            </span>
                        </div>

                        {displayedOrders.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <Icon name="receipt" className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-700">No orders match these criteria</p>
                                <p className="mt-1 text-xs text-gray-400">
                                    Try expanding the date range or removing status filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">Order Number</th>
                                            <th className="px-5 py-3">Channel / Table</th>
                                            <th className="px-5 py-3">Branch &amp; Cashier</th>
                                            <th className="px-5 py-3 text-right">Items</th>
                                            <th className="px-5 py-3 text-right">Total Amount</th>
                                            <th className="px-5 py-3">Status</th>
                                            <th className="px-5 py-3">Timestamp</th>
                                            <th className="px-5 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {displayedOrders.map((order) => {
                                            const statusTone = STATUS_TONE[order.status] ?? 'neutral';

                                            return (
                                                <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                                                    {/* Order Number */}
                                                    <td className="px-5 py-3.5">
                                                        <Link
                                                            href={route('orders.show', order.id)}
                                                            className="font-mono text-xs font-bold text-restrly-700 hover:text-restrly-900 underline-offset-2 hover:underline"
                                                        >
                                                            {order.order_number}
                                                        </Link>
                                                    </td>

                                                    {/* Channel & Table */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-gray-900">
                                                                {order.order_type_label}
                                                            </span>
                                                            {order.source === 'qr' && (
                                                                <span className="rounded-md bg-restrly-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-restrly-700 border border-restrly-200">
                                                                    QR
                                                                </span>
                                                            )}
                                                        </div>
                                                        {order.table_name && (
                                                            <span className="inline-block mt-0.5 rounded-md bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                                                                {order.table_name}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Branch & Staff */}
                                                    <td className="px-5 py-3.5 text-gray-600">
                                                        <div className="font-medium text-gray-800">
                                                            {order.branch_name ?? '—'}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400">
                                                            {order.cashier_name ?? 'Unassigned'}
                                                        </div>
                                                    </td>

                                                    {/* Items count */}
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-medium text-gray-700">
                                                        {order.items_count}
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-gray-900 tracking-tight">
                                                        {money(order.total, order.currency)}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-5 py-3.5">
                                                        <Badge tone={statusTone}>
                                                            {order.status}
                                                        </Badge>
                                                        {order.acceptance_status === 'pending' && (
                                                            <div className="mt-1">
                                                                <Badge tone="warning">Awaiting confirmation</Badge>
                                                            </div>
                                                        )}
                                                        {order.acceptance_status === 'rejected' && (
                                                            <div className="mt-1">
                                                                <Badge tone="danger">Rejected</Badge>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Placed at */}
                                                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                                                        {order.placed_at
                                                            ? new Date(order.placed_at).toLocaleString(undefined, {
                                                                  dateStyle: 'short',
                                                                  timeStyle: 'short',
                                                              })
                                                            : '—'}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {order.acceptance_status === 'pending' && (
                                                                <>
                                                                    <Button
                                                                        size="xs"
                                                                        onClick={() => router.post(route('orders.accept', order.id), {}, { preserveScroll: true })}
                                                                    >
                                                                        Accept
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        onClick={() => router.post(route('orders.reject', order.id), {}, { preserveScroll: true })}
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Link
                                                                href={route('orders.show', order.id)}
                                                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-subtle"
                                                            >
                                                                Details
                                                            </Link>
                                                            <Link
                                                                href={route('orders.receipt', order.id)}
                                                                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition shadow-subtle"
                                                                title="View / Print Receipt"
                                                            >
                                                                🖨
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {orders.links && orders.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            <div className="text-xs text-gray-500">
                                Showing {orders.from ?? 1} to {orders.to ?? orders.data.length} of {orders.total ?? orders.data.length} results
                            </div>
                            <div className="flex gap-1">
                                {orders.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url ?? '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-restrly-600 text-white shadow-subtle'
                                                : link.url
                                                  ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                                  : 'opacity-40 cursor-not-allowed border border-gray-200 text-gray-400'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
