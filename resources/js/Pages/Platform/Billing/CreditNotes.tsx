import { Card, DataTable, FilterBar, KpiCard, Pagination, TextField, formatDate, formatMoney } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface CreditNoteRow {
    id: number;
    number: string;
    tenant: string | null;
    invoice: string | null;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    issued_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

export default function CreditNotes({ records, filters, total }: { records: Paginated<CreditNoteRow>; filters: { search: string }; total: number }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const columns: Column<CreditNoteRow>[] = [
        { key: 'number', label: 'Credit note', render: (r) => <span className="font-medium text-gray-800">{r.number}</span> },
        { key: 'tenant', label: 'Tenant' },
        { key: 'invoice', label: 'Invoice', render: (r) => r.invoice ?? '—' },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'reason', label: 'Reason', render: (r) => <span className="text-gray-600">{r.reason}</span> },
        { key: 'issued_at', label: 'Issued', render: (r) => formatDate(r.issued_at) },
    ];

    return (
        <PlatformLayout title="Credit Notes" description="Credit notes issued against platform invoices. Finalized invoices are corrected through credit notes, never rewritten.">
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Total credited" value={formatMoney(total)} />
                <KpiCard label="Records" value={records.data.length} hint="On this page" />
            </div>
            <FilterBar>
                <TextField label="Search" value={search} placeholder="Credit note number" onChange={setSearch} onEnter={() => router.get(route('platform.billing.credit-notes'), { search }, { preserveState: true, preserveScroll: true, replace: true })} />
            </FilterBar>
            <Card>
                <DataTable columns={columns} rows={records.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No credit notes issued yet.</p>} />
            </Card>
            <Pagination links={records.links} />
            <p className="mt-2 text-xs text-gray-400">Credit notes are issued from an invoice's detail page.</p>
        </PlatformLayout>
    );
}
