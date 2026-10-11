import { Badge, Button, Card, DataTable, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface LogRow {
    id: number;
    level: string;
    message: string;
    channel: string | null;
    request_id: string | null;
    tenant_id: number | null;
    logged_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = { error: 'danger', critical: 'danger', emergency: 'danger', alert: 'danger', warning: 'warning', notice: 'info', info: 'neutral', debug: 'neutral' };

export default function OpsLogs({
    logs,
    filters,
    levels,
}: {
    logs: Paginated<LogRow>;
    filters: { search: string; level: string };
    levels: string[];
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.ops.logs'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<LogRow>[] = [
        { key: 'logged_at', label: 'When', render: (r) => (r.logged_at ? new Date(r.logged_at).toLocaleString() : '—') },
        { key: 'level', label: 'Level', render: (r) => <Badge tone={TONE[r.level] ?? 'neutral'}>{r.level}</Badge> },
        { key: 'message', label: 'Message', render: (r) => <span className="text-gray-700">{r.message.slice(0, 140)}</span> },
        { key: 'channel', label: 'Channel', render: (r) => r.channel ?? '—' },
        { key: 'request_id', label: 'Request', render: (r) => <span className="font-mono text-xs text-gray-400">{r.request_id ?? '—'}</span> },
        { key: 'tenant_id', label: 'Tenant', render: (r) => r.tenant_id ?? '—' },
    ];

    return (
        <PlatformLayout title="Application Logs">
            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Message" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Level" value={state.level} options={[{ value: '', label: 'Any level' }, ...levels.map((l) => ({ value: l, label: l }))]} onChange={(v) => apply({ level: v })} />
                <Button size="sm" onClick={() => apply()}>
                    Apply
                </Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={logs.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No log entries recorded yet.</p>} />
            </Card>
            <Pagination links={logs.links} />
            <p className="mt-2 text-xs text-gray-400">Warnings and above are captured. Sensitive keys are redacted before storage.</p>
        </PlatformLayout>
    );
}
