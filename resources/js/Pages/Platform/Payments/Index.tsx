import { Badge, Card, DataTable, FilterBar, KpiCard, Pagination, SelectField, TextField, formatMoney } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface PaymentRow {
    id: number;
    tenant: string | null;
    tenant_id: number;
    gateway: string;
    provider_ref: string | null;
    amount: number;
    currency: string;
    status: string;
    status_label: string;
    attempt_number: number;
    paid_at: string | null;
    refunded_amount: number;
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
    succeeded: 'success',
    pending: 'warning',
    processing: 'warning',
    failed: 'danger',
    cancelled: 'neutral',
    expired: 'neutral',
    refunded: 'neutral',
    partially_refunded: 'warning',
};

export default function PaymentsIndex({
    payments,
    summary,
    filters,
    options,
}: {
    payments: Paginated<PaymentRow>;
    summary: {
        unresolved_payments: number;
        succeeded_without_paid_at: number;
        duplicate_references: number;
        outstanding_total: number;
        paid_invoices_without_payment: number;
    };
    filters: { search: string; status: string; gateway: string };
    options: { statuses: Option[]; gateways: Option[] };
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.billing.payments.index'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<PaymentRow>[] = [
        {
            key: 'provider_ref',
            label: 'Reference',
            render: (r) => (
                <Link href={route('platform.billing.payments.show', r.id)} className="font-medium text-primary hover:text-primary/80">
                    {r.provider_ref ?? `#${r.id}`}
                </Link>
            ),
        },
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? '—' },
        { key: 'gateway', label: 'Gateway' },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status_label}</Badge> },
        { key: 'paid_at', label: 'Paid', render: (r) => (r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—') },
        { key: 'refunded_amount', label: 'Refunded', align: 'right', render: (r) => formatMoney(r.refunded_amount, r.currency) },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) =>
                r.status === 'succeeded' || r.status === 'refunded' ? (
                    <span className="text-xs text-gray-300">—</span>
                ) : (
                    <button onClick={() => router.post(route('platform.billing.payments.settle', r.id), {}, { preserveScroll: true })} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                        Mark settled
                    </button>
                ),
        },
    ];

    return (
        <PlatformLayout title="Payments" description="Gateway and manual payments against platform invoices, with reconciliation signals.">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Unresolved" value={summary.unresolved_payments} tone={summary.unresolved_payments > 0 ? 'warning' : 'neutral'} hint="Pending / processing" />
                <KpiCard label="Outstanding invoices" value={formatMoney(summary.outstanding_total)} tone="warning" hint="Not yet collected" />
                <KpiCard label="Duplicate references" value={summary.duplicate_references} tone={summary.duplicate_references > 0 ? 'danger' : 'neutral'} hint="Reconciliation check" />
                <KpiCard label="Paid w/o payment" value={summary.paid_invoices_without_payment} tone={summary.paid_invoices_without_payment > 0 ? 'warning' : 'neutral'} hint="Invoices marked paid with no gateway payment" />
            </div>

            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Reference" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Status" value={state.status} options={[{ value: '', label: 'Any status' }, ...options.statuses]} onChange={(v) => apply({ status: v })} />
                <SelectField label="Gateway" value={state.gateway} options={[{ value: '', label: 'Any gateway' }, ...options.gateways]} onChange={(v) => apply({ gateway: v })} />
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={payments.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={payments.links} />
        </PlatformLayout>
    );
}
