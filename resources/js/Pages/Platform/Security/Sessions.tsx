import { Badge, Button, Card, DataTable, FilterBar, Pagination, TextField } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface SessionRow {
    id: string;
    user: string | null;
    user_id: number | null;
    email: string | null;
    ip: string | null;
    user_agent: string;
    last_activity: string;
    is_current: boolean;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

export default function SecuritySessions({ sessions, filters }: { sessions: Paginated<SessionRow>; filters: { search: string } }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = () => router.get(route('platform.sessions.index'), { search }, { preserveState: true, preserveScroll: true, replace: true });

    const columns: Column<SessionRow>[] = [
        { key: 'user', label: 'Administrator', render: (r) => (
            <div>
                <div className="text-gray-800">{r.user ?? '—'} {r.is_current && <Badge tone="info">current</Badge>}</div>
                <div className="text-xs text-gray-400">{r.email}</div>
            </div>
        ) },
        { key: 'ip', label: 'IP', render: (r) => r.ip ?? '—' },
        { key: 'user_agent', label: 'User agent', render: (r) => <span className="text-xs text-gray-500">{r.user_agent}</span> },
        { key: 'last_activity', label: 'Last activity', render: (r) => new Date(r.last_activity).toLocaleString() },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
                <button onClick={() => router.delete(route('platform.sessions.destroy', r.id), { preserveScroll: true })} className="text-xs font-medium text-red-600 hover:text-red-700">
                    Revoke
                </button>
            ),
        },
    ];

    return (
        <PlatformLayout title="Admin Sessions">
            <FilterBar>
                <TextField label="Search" value={search} placeholder="IP address" onChange={setSearch} onEnter={apply} />
                <Button size="sm" onClick={apply}>Apply</Button>
            </FilterBar>
            <Card>
                <DataTable columns={columns} rows={sessions.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={sessions.links} />
            <p className="mt-2 text-xs text-gray-400">Only sessions belonging to platform administrators are shown. Revoking a session removes the stored session record.</p>
        </PlatformLayout>
    );
}
