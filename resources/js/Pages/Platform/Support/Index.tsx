import { Badge, Button, Card, DataTable, Drawer, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface TicketRow {
    id: number;
    subject: string;
    tenant: string | null;
    tenant_id: number;
    status: string;
    status_label: string;
    priority: string;
    assigned_to: string | null;
    messages_count: number;
    last_reply_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

interface Option {
    value: string;
    label: string;
}

const STATUS_TONE: Record<string, BadgeTone> = { open: 'info', pending: 'warning', resolved: 'success', closed: 'neutral' };
const PRIORITY_TONE: Record<string, BadgeTone> = { low: 'neutral', normal: 'info', high: 'warning', urgent: 'danger' };

export default function SupportIndex({
    tickets,
    filters,
    tenants,
    options,
}: {
    tickets: Paginated<TicketRow>;
    filters: { search: string; status: string; priority: string };
    tenants: { id: number; name: string }[];
    options: { statuses: Option[]; priorities: Option[] };
}) {
    const [state, setState] = useState(filters);
    const [open, setOpen] = useState(false);

    const form = useForm({
        tenant_id: (tenants[0]?.id ?? '') as number | string,
        subject: '',
        body: '',
        priority: 'normal',
    });

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.support.index'), next, { preserveState: true, preserveScroll: true, replace: true });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('platform.support.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('subject', 'body');
                setOpen(false);
            },
        });
    };

    const columns: Column<TicketRow>[] = [
        {
            key: 'subject',
            label: 'Subject',
            render: (t) => (
                <Link href={route('platform.support.show', t.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                    {t.subject}
                </Link>
            ),
        },
        { key: 'tenant', label: 'Tenant', render: (t) => t.tenant ?? '—' },
        { key: 'status', label: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status_label}</Badge> },
        { key: 'priority', label: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority] ?? 'neutral'}>{t.priority}</Badge> },
        { key: 'assigned_to', label: 'Assigned', render: (t) => t.assigned_to ?? 'Unassigned' },
        { key: 'messages_count', label: 'Messages', align: 'right' },
        { key: 'last_reply_at', label: 'Last reply', render: (t) => (t.last_reply_at ? new Date(t.last_reply_at).toLocaleString() : '—') },
    ];

    return (
        <PlatformLayout title="Support Tickets">
            <FilterBar actions={<Button size="sm" onClick={() => setOpen(true)}>New ticket</Button>}>
                <TextField label="Search" value={state.search} placeholder="Subject" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Status" value={state.status} options={[{ value: '', label: 'Any status' }, ...options.statuses]} onChange={(v) => apply({ status: v })} />
                <SelectField label="Priority" value={state.priority} options={[{ value: '', label: 'Any priority' }, ...options.priorities]} onChange={(v) => apply({ priority: v })} />
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={tickets.data} rowKey={(t) => t.id} />
            </Card>
            <Pagination links={tickets.links} />

            <Drawer show={open} onClose={() => setOpen(false)} title="New support ticket" footer={<Button size="sm" loading={form.processing} onClick={submit}>Create ticket</Button>}>
                <form onSubmit={submit} className="space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Tenant</span>
                        <select
                            value={form.data.tenant_id}
                            onChange={(e) => form.setData('tenant_id', e.target.value)}
                            className="block w-full rounded-md border-gray-300 text-sm"
                        >
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                        {form.errors.tenant_id && <span className="text-xs text-red-600">{form.errors.tenant_id}</span>}
                    </label>
                    <TextField label="Subject" value={form.data.subject} onChange={(v) => form.setData('subject', v)} />
                    {form.errors.subject && <span className="text-xs text-red-600">{form.errors.subject}</span>}
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Message</span>
                        <textarea value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} rows={5} className="block w-full rounded-md border-gray-300 text-sm" />
                        {form.errors.body && <span className="text-xs text-red-600">{form.errors.body}</span>}
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Priority</span>
                        <select value={form.data.priority} onChange={(e) => form.setData('priority', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm">
                            {options.priorities.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
