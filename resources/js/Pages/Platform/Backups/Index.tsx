import { Badge, Button, Card, ConfirmDialog, DataTable, FilterBar, KpiCard, Pagination, SelectField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface BackupRow {
    id: number;
    scope: string;
    tenant: string | null;
    tenant_id: number | null;
    path: string;
    size: string;
    checksum: string | null;
    encrypted: boolean;
    tables_count: number;
    rows_count: number;
    verification_result: string | null;
    verified_at: string | null;
    expires_at: string | null;
    created_at: string | null;
    created_by: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

interface Option {
    value: string;
    label: string;
}

const TONE: Record<string, BadgeTone> = { ok: 'success', failed: 'danger' };

export default function BackupsIndex({
    backups,
    stats,
    filters,
    tenants,
    scopes,
}: {
    backups: Paginated<BackupRow>;
    stats: { total: number; unverified: number; failed_verification: number; expiring_soon: number; total_bytes: number };
    filters: { scope: string; tenant: string };
    tenants: Option[];
    scopes: Option[];
}) {
    const [state, setState] = useState(filters);
    const [confirmDelete, setConfirmDelete] = useState<BackupRow | null>(null);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.backups.index'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<BackupRow>[] = [
        { key: 'scope', label: 'Scope', render: (r) => <Badge tone={r.scope === 'platform' ? 'info' : 'neutral'}>{r.scope}</Badge> },
        { key: 'tenant', label: 'Tenant', render: (r) => r.tenant ?? '—' },
        { key: 'size', label: 'Size', align: 'right' },
        { key: 'rows_count', label: 'Rows', align: 'right' },
        { key: 'checksum', label: 'Checksum', render: (r) => <span className="font-mono text-xs text-gray-500">{r.checksum ?? '—'}</span> },
        {
            key: 'verification_result',
            label: 'Verification',
            render: (r) => (r.verification_result ? <Badge tone={TONE[r.verification_result] ?? 'neutral'}>{r.verification_result}</Badge> : <Badge tone="warning">unverified</Badge>),
        },
        { key: 'expires_at', label: 'Expires', render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—') },
        { key: 'created_at', label: 'Created', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '—') },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
                <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => router.post(route('platform.backups.verify', r.id), {}, { preserveScroll: true })} className="font-medium text-primary hover:text-primary/80">
                        Verify
                    </button>
                    <a
                        href={route('platform.backups.download', r.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-600 hover:text-gray-800"
                    >
                        Download
                    </a>
                    <button onClick={() => setConfirmDelete(r)} className="font-medium text-red-600 hover:text-red-700">
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <PlatformLayout title="Backups" description="Platform and tenant snapshots. Verify a backup before relying on it for recovery.">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Backups" value={stats.total} hint="All scopes" />
                <KpiCard label="Unverified" value={stats.unverified} tone={stats.unverified > 0 ? 'warning' : 'neutral'} hint="Not yet read back" />
                <KpiCard label="Failed verification" value={stats.failed_verification} tone={stats.failed_verification > 0 ? 'danger' : 'neutral'} hint="Corrupt or unreadable" />
                <KpiCard label="Expiring soon" value={stats.expiring_soon} tone={stats.expiring_soon > 0 ? 'warning' : 'neutral'} hint="Within 7 days" />
            </div>

            <FilterBar
                actions={
                    <>
                        <Button size="sm" variant="secondary" onClick={() => router.post(route('platform.backups.prune'), {}, { preserveScroll: true })}>
                            Prune expired
                        </Button>
                        <Button size="sm" onClick={() => router.post(route('platform.backups.platform'), {}, { preserveScroll: true })}>
                            Create platform backup
                        </Button>
                    </>
                }
            >
                <SelectField label="Scope" value={state.scope} options={[{ value: '', label: 'All scopes' }, ...scopes]} onChange={(v) => apply({ scope: v })} />
                <SelectField label="Tenant" value={state.tenant} options={[{ value: '', label: 'All tenants' }, ...tenants]} onChange={(v) => apply({ tenant: v })} />
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={backups.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={backups.links} />

            <p className="mt-2 text-xs text-gray-400">
                Backups are logical snapshots saved to private storage. A tenant backup includes every table carrying a tenant_id plus child tables reached through foreign keys. Verify a backup before relying on it.
            </p>

            <ConfirmDialog
                show={confirmDelete !== null}
                title="Delete backup?"
                description="The artifact and its metadata record are removed. This cannot be undone."
                confirmLabel="Delete backup"
                onConfirm={() => {
                    if (confirmDelete) router.delete(route('platform.backups.destroy', confirmDelete.id), { preserveScroll: true, onFinish: () => setConfirmDelete(null) });
                }}
                onClose={() => setConfirmDelete(null)}
            />
        </PlatformLayout>
    );
}
