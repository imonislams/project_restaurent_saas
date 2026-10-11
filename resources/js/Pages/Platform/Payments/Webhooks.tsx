import { Badge, Button, Card, DataTable, FilterBar, KpiCard, Pagination, SelectField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface EventRow {
    id: number;
    provider: string;
    event_type: string | null;
    event_id: string | null;
    tenant: string | null;
    signature_valid: boolean;
    processed: boolean;
    note: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

export default function PaymentWebhooks({
    events,
    stats,
    filters,
}: {
    events: Paginated<EventRow>;
    stats: { total: number; processed: number; invalid: number };
    filters: { provider: string; processed: string };
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.payments.webhooks'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<EventRow>[] = [
        { key: 'created_at', label: 'Received', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '—') },
        { key: 'provider', label: 'Provider' },
        { key: 'event_type', label: 'Type', render: (r) => r.event_type ?? '—' },
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? '—' },
        { key: 'signature_valid', label: 'Verified', render: (r) => <Badge tone={r.signature_valid ? 'success' : 'danger'}>{r.signature_valid ? 'verified' : 'unverified'}</Badge> },
        { key: 'processed', label: 'Processed', render: (r) => <Badge tone={r.processed ? 'success' : 'neutral'}>{r.processed ? 'yes' : 'no'}</Badge> },
        { key: 'note', label: 'Note', render: (r) => <span className="text-xs text-gray-500">{r.note ?? '—'}</span> },
    ];

    return (
        <PlatformLayout title="Payment Webhooks" description="Raw gateway notifications. Events are stored before processing and deduplicated by provider + event id.">
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Events" value={stats.total} />
                <KpiCard label="Processed" value={stats.processed} tone="success" />
                <KpiCard label="Unverified" value={stats.invalid} tone={stats.invalid > 0 ? 'warning' : 'neutral'} />
            </div>
            <FilterBar>
                <SelectField label="Provider" value={state.provider} options={[{ value: '', label: 'Any provider' }, { value: 'sslcommerz', label: 'SSLCommerz' }, { value: 'manual', label: 'Manual' }]} onChange={(v) => apply({ provider: v })} />
                <SelectField label="Processed" value={state.processed} options={[{ value: '', label: 'Any' }, { value: 'yes', label: 'Processed' }, { value: 'no', label: 'Unprocessed' }]} onChange={(v) => apply({ processed: v })} />
                <Button size="sm" onClick={() => apply()}>Apply</Button>
            </FilterBar>
            <Card>
                <DataTable columns={columns} rows={events.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No gateway events recorded yet.</p>} />
            </Card>
            <Pagination links={events.links} />
        </PlatformLayout>
    );
}
