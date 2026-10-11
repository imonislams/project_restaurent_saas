import { Badge, Button, Card, DataTable, FilterBar, KpiCard, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface EventRow {
    id: number;
    event: string;
    user: string | null;
    email: string | null;
    ip: string | null;
    user_agent: string | null;
    meta: Record<string, unknown> | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = { login: 'success', login_failed: 'danger', logout: 'neutral' };

export default function SecurityEvents({
    events,
    stats,
    filters,
    events_list,
}: {
    events: Paginated<EventRow>;
    stats: { logins_24h: number; failed_24h: number; total: number };
    filters: { event: string; search: string };
    events_list: string[];
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.security.index'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<EventRow>[] = [
        { key: 'created_at', label: 'When', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '—') },
        { key: 'event', label: 'Event', render: (r) => <Badge tone={TONE[r.event] ?? 'info'}>{r.event}</Badge> },
        { key: 'user', label: 'Actor', render: (r) => r.user ?? r.email ?? '—' },
        { key: 'ip', label: 'IP', render: (r) => r.ip ?? '—' },
        { key: 'user_agent', label: 'User agent', render: (r) => <span className="text-xs text-gray-500">{r.user_agent?.slice(0, 70)}</span> },
    ];

    return (
        <PlatformLayout title="Security Events">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KpiCard label="Logins (24h)" value={stats.logins_24h} tone="success" />
                <KpiCard label="Failed logins (24h)" value={stats.failed_24h} tone={stats.failed_24h > 0 ? 'danger' : 'neutral'} />
                <KpiCard label="Total events" value={stats.total} />
            </div>

            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Email or IP" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Event" value={state.event} options={[{ value: '', label: 'Any event' }, ...events_list.map((e) => ({ value: e, label: e }))]} onChange={(v) => apply({ event: v })} />
                <Button size="sm" onClick={() => apply()}>Apply</Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={events.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={events.links} />
        </PlatformLayout>
    );
}
