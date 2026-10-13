import Icon from '@/Components/Icon';
import Badge, { BadgeTone } from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card, { CardContent } from '@/Components/ui/Card';
import KpiCard from '@/Components/ui/KpiCard';
import PageHeader from '@/Components/ui/PageHeader';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/Table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
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
                <PageHeader
                    title="Orders Management"
                    description="Monitor, filter, settle, and audit sales transactions across all channels."
                    actions={
                        <Link href={route('pos.index')}>
                            <Button icon={<Icon name="cart" className="h-4 w-4" />}>
                                Open POS
                            </Button>
                        </Link>
                    }
                />
            }
        >
            <Head title="Orders Management" />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <Icon name="check" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs sm:text-sm font-medium text-destructive">
                            <Icon name="alert" className="h-4 w-4 shrink-0 text-destructive" />
                            <span>{flash.error}</span>
                        </div>
                    )}

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            title="Total Orders"
                            value={orders.total ?? orders.data.length}
                            hint="in selected period"
                        />
                        <KpiCard
                            title="Completed Sales"
                            value={metrics.completedCount}
                            tone="success"
                            hint="settled & finalized"
                        />
                        <KpiCard
                            title="Open / Held"
                            value={metrics.openCount}
                            tone="warning"
                            hint="pending payment"
                        />
                        <KpiCard
                            title="Net Volume"
                            value={money(metrics.totalVolume, metrics.currency)}
                            hint="sum of total"
                        />
                    </div>

                    {/* Filter & Search Bar */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            {/* Quick Presets Row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    <span className="text-xs font-semibold text-muted-foreground mr-1">Period:</span>
                                    {(['today', 'yesterday', '7days', '30days'] as const).map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setDatePreset(preset)}
                                            className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition"
                                        >
                                            {preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : preset === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Box */}
                                <div className="relative w-full sm:w-64">
                                    <Icon
                                        name="search"
                                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Quick filter (Order #, table)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Detailed Inputs Row */}
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 items-end">
                                <div>
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={from}
                                        onChange={(e) => setFrom(e.target.value)}
                                        className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={to}
                                        onChange={(e) => setTo(e.target.value)}
                                        className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Status
                                    </label>
                                    <select
                                        aria-label="Order Status"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Order Channel
                                    </label>
                                    <select
                                        aria-label="Order Channel"
                                        value={orderType}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="h-9 w-full rounded-md border border-input bg-background py-1.5 px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
                                        className="w-full justify-center"
                                        onClick={() => apply({ status: status || null, order_type: orderType || null })}
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Orders Data Table */}
                    <Card>
                        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Order Records ({displayedOrders.length} shown)
                            </span>
                        </div>

                        {displayedOrders.length === 0 ? (
                            <div className="py-16 text-center text-muted-foreground">
                                <Icon name="receipt" className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                                <p className="text-sm font-semibold text-foreground">No orders match these criteria</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Try expanding the date range or removing status filters.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="px-5 py-3">Order Number</TableHead>
                                            <TableHead className="px-5 py-3">Channel / Table</TableHead>
                                            <TableHead className="px-5 py-3">Branch &amp; Cashier</TableHead>
                                            <TableHead className="px-5 py-3 text-right">Items</TableHead>
                                            <TableHead className="px-5 py-3 text-right">Total Amount</TableHead>
                                            <TableHead className="px-5 py-3">Status</TableHead>
                                            <TableHead className="px-5 py-3">Timestamp</TableHead>
                                            <TableHead className="px-5 py-3 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedOrders.map((order) => {
                                            const statusTone = STATUS_TONE[order.status] ?? 'neutral';

                                            return (
                                                <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                                                    {/* Order Number */}
                                                    <TableCell className="px-5 py-3.5">
                                                        <Link
                                                            href={route('orders.show', order.id)}
                                                            className="font-mono text-xs font-semibold text-primary hover:underline underline-offset-2"
                                                        >
                                                            {order.order_number}
                                                        </Link>
                                                    </TableCell>

                                                    {/* Channel & Table */}
                                                    <TableCell className="px-5 py-3.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-foreground">
                                                                {order.order_type_label}
                                                            </span>
                                                            {order.source === 'qr' && (
                                                                <Badge tone="brand" className="text-[10px]">
                                                                    QR
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {order.table_name && (
                                                            <span className="inline-block mt-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-400">
                                                                {order.table_name}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Branch & Staff */}
                                                    <TableCell className="px-5 py-3.5 text-muted-foreground">
                                                        <div className="font-medium text-foreground">
                                                            {order.branch_name ?? '—'}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {order.cashier_name ?? 'Unassigned'}
                                                        </div>
                                                    </TableCell>

                                                    {/* Items count */}
                                                    <TableCell className="px-5 py-3.5 text-right font-mono text-xs font-medium text-foreground tabular-nums">
                                                        {order.items_count}
                                                    </TableCell>

                                                    {/* Total */}
                                                    <TableCell className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-foreground tracking-tight tabular-nums">
                                                        {money(order.total, order.currency)}
                                                    </TableCell>

                                                    {/* Status Badge */}
                                                    <TableCell className="px-5 py-3.5">
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
                                                    </TableCell>

                                                    {/* Placed at */}
                                                    <TableCell className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                                                        {order.placed_at
                                                            ? new Date(order.placed_at).toLocaleString(undefined, {
                                                                  dateStyle: 'short',
                                                                  timeStyle: 'short',
                                                              })
                                                            : '—'}
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="px-5 py-3.5 text-right whitespace-nowrap">
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
                                                            <Link href={route('orders.show', order.id)}>
                                                                <Button variant="outline" size="xs">
                                                                    Details
                                                                </Button>
                                                            </Link>
                                                            <Link
                                                                href={route('orders.receipt', order.id)}
                                                                title="View / Print Receipt"
                                                            >
                                                                <Button variant="ghost" size="xs">
                                                                    <Printer className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Card>

                    {/* Pagination */}
                    {orders.links && orders.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-border pt-4">
                            <div className="text-xs text-muted-foreground">
                                Showing {orders.from ?? 1} to {orders.to ?? orders.data.length} of {orders.total ?? orders.data.length} results
                            </div>
                            <div className="flex gap-1">
                                {orders.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url ?? '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : link.url
                                                  ? 'border border-border bg-card text-foreground hover:bg-muted'
                                                  : 'opacity-40 cursor-not-allowed border border-border text-muted-foreground'
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
