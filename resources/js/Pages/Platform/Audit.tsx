import { Button, Card, DataTable, FilterBar, Pagination, SelectField, TextField, ActivityBadge } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface LogRow {
    id: number;
    tenant_id: number | null;
    action: string;
    actor: string | null;
    subject: string | null;
    metadata: Record<string, unknown> | null;
    ip: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

interface Option {
    value: string;
    label: string;
}

export default function PlatformAudit({
    logs,
    filters,
    actors,
}: {
    logs: Paginated<LogRow>;
    filters: { action: string; actor: string; tenant: string; from: string; to: string };
    actors: Option[];
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.audit.index'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<LogRow>[] = [
        { key: 'created_at', label: 'When', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '') },
        { key: 'action', label: 'Action', render: (r) => (
            <div className="flex flex-col items-start gap-1">
                <ActivityBadge action={r.action} showIcon />
                <span className="font-mono text-[11px] text-gray-400">{r.action}</span>
            </div>
        ) },
        { key: 'actor', label: 'Actor', render: (r) => r.actor ?? 'System' },
        { key: 'tenant_id', label: 'Tenant', render: (r) => r.tenant_id ?? '—' },
        { key: 'subject', label: 'Subject', render: (r) => <span className="font-mono text-xs text-gray-500">{r.subject ?? '—'}</span> },
        { key: 'ip', label: 'IP', render: (r) => r.ip ?? '—' },
        {
            key: 'metadata',
            label: 'Details',
            render: (r) =>
                r.metadata ? (
                    <details className="text-xs">
                        <summary className="cursor-pointer text-indigo-600">view</summary>
                        <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 text-[11px] text-gray-600">{JSON.stringify(r.metadata, null, 2)}</pre>
                    </details>
                ) : (
                    '—'
                ),
        },
    ];

    return (
        <PlatformLayout title="Audit Logs">
            <FilterBar actions={<Button size="sm" variant="secondary" href={route('platform.audit.export', state as unknown as Record<string, unknown>)}>Export CSV</Button>}>
                <TextField label="Action" value={state.action} placeholder="e.g. platform.tenant" onChange={(v) => setState((s) => ({ ...s, action: v }))} onEnter={() => apply()} />
                <SelectField label="Actor" value={state.actor} options={[{ value: '', label: 'Any actor' }, ...actors]} onChange={(v) => apply({ actor: v })} />
                <TextField label="From" type="date" value={state.from} onChange={(v) => apply({ from: v })} />
                <TextField label="To" type="date" value={state.to} onChange={(v) => apply({ to: v })} />
                <Button size="sm" onClick={() => apply()}>Apply</Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={logs.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No audit records.</p>} />
            </Card>
            <Pagination links={logs.links} />
        </PlatformLayout>
    );
}
