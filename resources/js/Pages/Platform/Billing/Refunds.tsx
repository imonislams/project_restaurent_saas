import { Badge, Card, DataTable, KpiCard, Pagination, formatDate, formatMoney } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

interface RefundRow {
    id: number;
    tenant: string | null;
    payment: string | null;
    gateway: string | null;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    gateway_ref: string | null;
    processed_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = { succeeded: 'success', pending: 'warning', processing: 'warning', failed: 'danger' };

export default function Refunds({ records, total }: { records: Paginated<RefundRow>; total: number }) {
    const columns: Column<RefundRow>[] = [
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? '—' },
        { key: 'payment', label: 'Payment', render: (r) => <span className="font-mono text-xs text-gray-500">{r.payment ?? '—'}</span> },
        { key: 'gateway', label: 'Gateway', render: (r) => r.gateway ?? '—' },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount, r.currency) },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
        { key: 'reason', label: 'Reason', render: (r) => <span className="text-gray-600">{r.reason}</span> },
        { key: 'processed_at', label: 'Processed', render: (r) => formatDate(r.processed_at) },
    ];

    return (
        <PlatformLayout title="Refunds" description="Refunds requested against platform payments. A refund can never exceed the refundable balance.">
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Total refunded" value={formatMoney(total)} />
                <KpiCard label="Records" value={records.data.length} hint="On this page" />
            </div>
            <Card>
                <DataTable columns={columns} rows={records.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No refunds recorded yet.</p>} />
            </Card>
            <Pagination links={records.links} />
            <p className="mt-2 text-xs text-gray-400">Refunds are initiated from a payment's detail page.</p>
        </PlatformLayout>
    );
}
