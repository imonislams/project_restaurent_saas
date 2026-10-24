import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface InvoiceRow {
    id: number;
    number: string;
    status: string;
    status_label: string;
    table_name: string | null;
    branch_name: string | null;
    orders_count: number;
    total: number;
    paid_total: number;
    outstanding: number;
    currency: string;
    issued_at: string | null;
    paid_at: string | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

const STATUS_TONES: Record<string, BadgeTone> = {
    open: 'info',
    draft: 'neutral',
    partially_paid: 'warning',
    paid: 'success',
    void: 'danger',
};

export default function InvoicesIndex({
    invoices,
    branches,
    canViewAllBranches,
    filters,
    statuses,
}: {
    invoices: Paginated<InvoiceRow>;
    branches: { id: number; name: string }[];
    canViewAllBranches: boolean;
    filters: { status: string | null; q: string | null; branch_id: number | null };
    statuses: { value: string; label: string }[];
}) {
    const { flash } = usePage().props as Record<string, any>;
    const [status, setStatus] = useState(filters.status ?? '');
    const [search, setSearch] = useState(filters.q ?? '');

    const apply = (params: Record<string, unknown>) => {
        router.get(route('invoices.index'), {
            status: status || undefined,
            q: search || undefined,
            branch_id: filters.branch_id ?? undefined,
            ...params,
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const kpis = useMemo(() => {
        const rows = invoices.data;
        return {
            open: rows.filter((r) => r.status === 'open' || r.status === 'partially_paid').length,
            outstanding: rows.reduce((sum, r) => sum + r.outstanding, 0),
            paid: rows.filter((r) => r.status === 'paid').length,
        };
    }, [invoices.data]);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Bills & Invoices"
                    description="Invoices that served orders feed into. Additional orders on a table join the open invoice until it is paid."
                />
            }
        >
            <Head title="Bills & Invoices" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <KpiCard label="Open / Unpaid" value={kpis.open} tone={kpis.open > 0 ? 'warning' : 'neutral'} />
                        <KpiCard label="Outstanding (this page)" value={kpis.outstanding.toFixed(2)} tone={kpis.outstanding > 0 ? 'warning' : 'success'} />
                        <KpiCard label="Paid" value={kpis.paid} tone="success" />
                    </div>

                    <Card>
                        <CardHeader
                            title="Invoices"
                            description={`${invoices.total} total`}
                            action={
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search invoice #"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && apply({ q: search || undefined, status: status || undefined })}
                                        className="h-9 w-44 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                    <select
                                        value={status}
                                        onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value || undefined }); }}
                                        className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="">All statuses</option>
                                        {statuses.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                    {canViewAllBranches && (
                                        <select
                                            value={filters.branch_id ?? 'all'}
                                            onChange={(e) => apply({ branch_id: e.target.value })}
                                            className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        >
                                            <option value="all">All branches</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            }
                        />
                        <CardBody className="p-0">
                            {invoices.data.length === 0 ? (
                                <EmptyState
                                    title="No invoices yet"
                                    description="Invoices appear automatically when an order is marked served. Combined orders on a table stay on one open invoice."
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <tr>
                                                <th className="px-6 py-3.5">Invoice</th>
                                                <th className="px-6 py-3.5">Table</th>
                                                <th className="px-6 py-3.5">Branch</th>
                                                <th className="px-6 py-3.5 text-right">Orders</th>
                                                <th className="px-6 py-3.5 text-right">Total</th>
                                                <th className="px-6 py-3.5 text-right">Outstanding</th>
                                                <th className="px-6 py-3.5 text-center">Status</th>
                                                <th className="px-6 py-3.5 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {invoices.data.map((invoice) => (
                                                <tr key={invoice.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-semibold text-gray-900">{invoice.number}</td>
                                                    <td className="px-6 py-4 text-gray-600">{invoice.table_name ?? '—'}</td>
                                                    <td className="px-6 py-4 text-gray-600">{invoice.branch_name ?? '—'}</td>
                                                    <td className="px-6 py-4 text-right tabular-nums text-gray-700">{invoice.orders_count}</td>
                                                    <td className="px-6 py-4 text-right font-mono tabular-nums text-gray-900">
                                                        {invoice.currency} {invoice.total.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono tabular-nums text-rose-700">
                                                        {invoice.currency} {invoice.outstanding.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <Badge tone={STATUS_TONES[invoice.status] ?? 'neutral'}>{invoice.status_label}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link href={route('invoices.show', invoice.id)}>
                                                            <Button size="xs" variant="secondary">Open</Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
