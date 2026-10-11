import { Badge, Card, DataTable, KpiCard, Pagination, formatDate, formatMoney } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

interface AdjustmentRow {
    id: number;
    tenant: string | null;
    invoice: string | null;
    type: string;
    amount: number;
    currency: string;
    reason: string;
    applied_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

export default function Adjustments({ records, total_debit, total_credit }: { records: Paginated<AdjustmentRow>; total_debit: number; total_credit: number }) {
    const columns: Column<AdjustmentRow>[] = [
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? '—' },
        { key: 'invoice', label: 'Invoice', render: (r) => r.invoice ?? '—' },
        { key: 'type', label: 'Type', render: (r) => <Badge tone={(r.type === 'debit' ? 'warning' : 'info') as BadgeTone}>{r.type}</Badge> },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'reason', label: 'Reason', render: (r) => <span className="text-gray-600">{r.reason}</span> },
        { key: 'applied_at', label: 'Applied', render: (r) => formatDate(r.applied_at) },
    ];

    return (
        <PlatformLayout title="Billing Adjustments" description="Manual debits and credits. A debit increases the balance; a credit reduces it.">
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Total credited" value={formatMoney(total_credit)} tone="success" />
                <KpiCard label="Total debited" value={formatMoney(total_debit)} tone="warning" />
                <KpiCard label="Records" value={records.data.length} hint="On this page" />
            </div>
            <Card>
                <DataTable columns={columns} rows={records.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No adjustments recorded yet.</p>} />
            </Card>
            <Pagination links={records.links} />
            <p className="mt-2 text-xs text-gray-400">Adjustments are recorded from an invoice's detail page.</p>
        </PlatformLayout>
    );
}
