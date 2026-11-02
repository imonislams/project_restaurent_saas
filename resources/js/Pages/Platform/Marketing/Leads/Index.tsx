import { Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, EmptyState, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import { formatDateTime } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface LeadRow {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    business_name: string | null;
    country: string | null;
    source_label: string;
    status: string;
    status_label: string;
    score: number;
    assignee: string | null;
    campaign: string | null;
    is_converted: boolean;
    created_at: string | null;
    follow_up_at: string | null;
}

interface BoardColumn {
    status: string;
    label: string;
    leads: LeadRow[];
}

export default function LeadsIndex({
    leads,
    board,
    filters,
    counts,
    options,
}: {
    leads: { data: LeadRow[]; links: PageLink[] };
    board: BoardColumn[];
    filters: { search: string; status: string; source: string; assigned_to: string; view: string };
    counts: { total: number; open: number; due_today: number; unassigned: number; converted: number };
    options: { statuses: Array<{ value: string; label: string }>; sources: Array<{ value: string; label: string }>; assignees: Array<{ value: string; label: string }> };
}) {
    const [state, setState] = useState(filters);

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.marketing.leads.index'), next as never, { preserveState: true, preserveScroll: true, replace: true });
    };

    const columns: Column<LeadRow>[] = [
        {
            key: 'name',
            label: 'Lead',
            render: (row) => (
                <Link href={route('platform.marketing.leads.show', row.id)} className="min-w-0 block hover:underline">
                    <span className="block truncate text-sm font-medium text-foreground">{row.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{row.email}</span>
                </Link>
            ),
        },
        { key: 'business_name', label: 'Restaurant', render: (row) => <span className="truncate text-xs">{row.business_name ?? '—'}</span> },
        { key: 'source_label', label: 'Source', render: (row) => <span className="text-xs">{row.source_label}</span> },
        { key: 'status_label', label: 'Status', render: (row) => <Badge tone={row.is_converted ? 'success' : 'neutral'}>{row.status_label}</Badge> },
        { key: 'score', label: 'Score', align: 'right' },
        { key: 'assignee', label: 'Owner', render: (row) => <span className="text-xs">{row.assignee ?? 'Unassigned'}</span> },
        {
            key: 'follow_up_at',
            label: 'Follow up',
            render: (row) => <span className="text-xs">{row.follow_up_at ? formatDateTime(row.follow_up_at) : '—'}</span>,
        },
    ];

    return (
        <PlatformLayout
            title="Leads"
            description="Every restaurant enquiry, with the campaign that produced it."
            actions={
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => apply({ view: state.view === 'board' ? 'table' : 'board' })}>
                        {state.view === 'board' ? 'Table view' : 'Board view'}
                    </Button>
                    <Button size="sm" variant="secondary" external href={route('platform.marketing.leads.export', state)}>
                        Export CSV
                    </Button>
                </div>
            }
        >
            <Head title="Leads" />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    ['Total', counts.total],
                    ['Open', counts.open],
                    ['Due today', counts.due_today],
                    ['Unassigned', counts.unassigned],
                    ['Converted', counts.converted],
                ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
                    </div>
                ))}
            </div>

            <FilterBar>
                <div className="flex flex-wrap items-end gap-3">
                    <TextField label="Search" value={state.search} onChange={(value) => setState((p) => ({ ...p, search: value }))} onEnter={() => apply()} />
                    <SelectField label="Status" value={state.status} options={[{ value: '', label: 'All' }, ...options.statuses]} onChange={(value) => apply({ status: value })} />
                    <SelectField label="Source" value={state.source} options={[{ value: '', label: 'All' }, ...options.sources]} onChange={(value) => apply({ source: value })} />
                    <SelectField
                        label="Owner"
                        value={state.assigned_to}
                        options={[{ value: '', label: 'Anyone' }, { value: 'unassigned', label: 'Unassigned' }, ...options.assignees]}
                        onChange={(value) => apply({ assigned_to: value })}
                    />
                    <Button size="sm" onClick={() => apply()}>
                        Apply
                    </Button>
                </div>
            </FilterBar>

            {state.view === 'board' ? (
                <div className="grid gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {board.map((column) => (
                        <div key={column.status} className="rounded-lg border border-border bg-card">
                            <div className="border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
                                {column.label}
                                <span className="ml-2 text-muted-foreground">{column.leads.length}</span>
                            </div>
                            <ul className="space-y-2 p-2">
                                {column.leads.map((lead) => (
                                    <li key={lead.id}>
                                        <Link
                                            href={route('platform.marketing.leads.show', lead.id)}
                                            className="block rounded-md border border-border p-2 text-xs hover:bg-accent"
                                        >
                                            <span className="block truncate font-medium text-foreground">{lead.name}</span>
                                            <span className="block truncate text-muted-foreground">{lead.business_name ?? lead.email}</span>
                                        </Link>
                                    </li>
                                ))}
                                {column.leads.length === 0 && <li className="px-1 py-2 text-xs text-muted-foreground">Empty</li>}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <Card>
                        <CardBody className="p-0">
                            <DataTable
                                columns={columns}
                                rows={leads.data}
                                rowKey={(row) => row.id}
                                empty={
                                    <EmptyState
                                        title="No leads yet"
                                        description="Submissions from the contact and demo form appear here — each one is attributed from the visitor's own campaign context."
                                    />
                                }
                            />
                        </CardBody>
                    </Card>
                    <Pagination links={leads.links} />
                </>
            )}

            <Alert variant="info" title="Where these come from">
                Every submission of the public contact/demo form is stored here with its UTM chain, and a restaurant that
                registers with the same email is linked to its lead rather than duplicated.
            </Alert>
        </PlatformLayout>
    );
}
