import { ActivityBadge, Card, DataTable, Pagination } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

interface LogRow {
    id: number;
    action: string;
    actor: string | null;
    tenant: string | null;
    tenant_id: number | null;
    metadata: Record<string, unknown> | null;
    ip: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

export default function SecurityImpersonation({ logs }: { logs: Paginated<LogRow> }) {
    const columns: Column<LogRow>[] = [
        { key: 'created_at', label: 'When', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '—') },
        { key: 'action', label: 'Event', render: (r) => <ActivityBadge action={r.action} /> },
        { key: 'actor', label: 'Administrator', render: (r) => r.actor ?? '—' },
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? (r.tenant_id ? `#${r.tenant_id}` : '—') },
        { key: 'reason', label: 'Reason', render: (r) => <span className="text-xs text-gray-500">{r.metadata && 'reason' in r.metadata ? String(r.metadata.reason) : '—'}</span> },
        { key: 'ip', label: 'IP', render: (r) => r.ip ?? '—' },
    ];

    return (
        <PlatformLayout title="Impersonation History">
            <p className="mb-4 text-sm text-gray-500">Every support impersonation is recorded with the administrator, tenant, reason, IP and timestamp.</p>
            <Card>
                <DataTable columns={columns} rows={logs.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No impersonation events recorded.</p>} />
            </Card>
            <Pagination links={logs.links} />
        </PlatformLayout>
    );
}
