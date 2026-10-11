import { Badge, Button, Card, DataTable, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface LogRow {
    id: number;
    to: string;
    subject: string | null;
    status: string;
    mailer: string | null;
    attempts: number;
    error: string | null;
    retryable: boolean;
    sent_at: string | null;
    failed_at: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = { sent: 'success', failed: 'danger', queued: 'warning' };

export default function EmailLogs({
    logs,
    filters,
    title,
}: {
    logs: Paginated<LogRow>;
    filters: { search: string; status: string };
    title: string;
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.email.logs'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<LogRow>[] = [
        { key: 'to', label: 'To' },
        { key: 'subject', label: 'Subject', render: (r) => r.subject ?? '(no subject)' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
        { key: 'mailer', label: 'Mailer', render: (r) => r.mailer ?? '—' },
        { key: 'attempts', label: 'Attempts', align: 'right' },
        { key: 'error', label: 'Error', render: (r) => <span className="text-xs text-red-600">{r.error ? r.error.slice(0, 80) : '—'}</span> },
        { key: 'created_at', label: 'When', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : '—') },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) =>
                r.retryable ? (
                    <button onClick={() => router.post(route('platform.email.retry', r.id), {}, { preserveScroll: true })} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        Retry
                    </button>
                ) : (
                    <span className="text-xs text-gray-300">—</span>
                ),
        },
    ];

    return (
        <PlatformLayout title={title}>
            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Recipient or subject" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField
                    label="Status"
                    value={state.status}
                    options={[
                        { value: '', label: 'Any status' },
                        { value: 'sent', label: 'Sent' },
                        { value: 'failed', label: 'Failed' },
                        { value: 'queued', label: 'Queued' },
                    ]}
                    onChange={(v) => apply({ status: v })}
                />
                <Button size="sm" onClick={() => apply()}>
                    Apply
                </Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={logs.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={logs.links} />
        </PlatformLayout>
    );
}
