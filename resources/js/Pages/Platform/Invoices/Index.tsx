import { Badge, Button, Card, DataTable, FilterBar, KpiCard, Pagination, SelectField, TextField, formatMoney } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface InvoiceRow {
    id: number;
    number: string;
    tenant: string | null;
    tenant_id: number;
    amount: number;
    currency: string;
    status: string;
    status_label: string;
    issued_at: string | null;
    due_date: string | null;
    paid_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

interface Option {
    value: string;
    label: string;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    paid: 'success',
    open: 'warning',
    issued: 'warning',
    partially_paid: 'warning',
    overdue: 'danger',
    void: 'neutral',
    draft: 'neutral',
    refunded: 'neutral',
};

export default function InvoicesIndex({
    invoices,
    summary,
    filters,
    options,
}: {
    invoices: Paginated<InvoiceRow>;
    summary: { outstanding: number; paid_this_month: number };
    filters: { search: string; status: string };
    options: { statuses: Option[] };
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.billing.invoices.index'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<InvoiceRow>[] = [
        {
            key: 'number',
            label: 'Invoice',
            render: (r) => (
                <Link href={route('platform.billing.invoices.show', r.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                    {r.number}
                </Link>
            ),
        },
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? '—' },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status_label}</Badge> },
        { key: 'issued_at', label: 'Issued', render: (r) => (r.issued_at ? new Date(r.issued_at).toLocaleDateString() : '—') },
        { key: 'due_date', label: 'Due', render: (r) => (r.due_date ? new Date(r.due_date).toLocaleDateString() : '—') },
        { key: 'paid_at', label: 'Paid', render: (r) => (r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—') },
    ];

    return (
        <PlatformLayout title="Invoices" description="Subscription invoices issued to tenants, with outstanding and collected totals.">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Outstanding" value={formatMoney(summary.outstanding)} tone={summary.outstanding > 0 ? 'warning' : 'neutral'} hint="Issued, open, overdue and partial" />
                <KpiCard label="Collected this month" value={formatMoney(summary.paid_this_month)} tone="success" hint="Paid invoice total" />
            </div>

            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Invoice number" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Status" value={state.status} options={[{ value: '', label: 'Any status' }, ...options.statuses]} onChange={(v) => apply({ status: v })} />
                <Button size="sm" onClick={() => apply()}>
                    Apply
                </Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={invoices.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={invoices.links} />
        </PlatformLayout>
    );
}
