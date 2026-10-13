import { Badge, Button, Card, DataTable, Drawer, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import { Input } from '@/Components/ui/Input';
import { Textarea } from '@/Components/ui/Textarea';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Plus, MessageSquare, Headphones } from 'lucide-react';

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
                <Link href={route('platform.support.show', t.id)} className="font-medium text-foreground hover:text-primary hover:underline">
                    {t.subject}
                </Link>
            ),
        },
        { 
            key: 'tenant', 
            label: 'Tenant', 
            render: (t) => t.tenant ? (
                <Link href={route('platform.tenants.show', t.tenant_id)} className="text-muted-foreground hover:text-foreground">
                    {t.tenant}
                </Link>
            ) : '—' 
        },
        { key: 'status', label: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status_label}</Badge> },
        { key: 'priority', label: 'Priority', render: (t) => <Badge tone={PRIORITY_TONE[t.priority] ?? 'neutral'}>{t.priority}</Badge> },
        { key: 'assigned_to', label: 'Assigned', render: (t) => t.assigned_to ?? <span className="text-muted-foreground italic">Unassigned</span> },
        { key: 'messages_count', label: 'Messages', align: 'right' },
        { key: 'last_reply_at', label: 'Last reply', render: (t) => (t.last_reply_at ? new Date(t.last_reply_at).toLocaleString() : '—') },
    ];

    return (
        <PlatformLayout title="Support Tickets">
            <FilterBar actions={
                <Button size="sm" onClick={() => setOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New ticket
                </Button>
            }>
                <TextField label="Search" value={state.search} placeholder="Subject" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Status" value={state.status} options={[{ value: '', label: 'Any status' }, ...options.statuses]} onChange={(v) => apply({ status: v })} />
                <SelectField label="Priority" value={state.priority} options={[{ value: '', label: 'Any priority' }, ...options.priorities]} onChange={(v) => apply({ priority: v })} />
            </FilterBar>

            <Card className="mt-4">
                <DataTable columns={columns} rows={tickets.data} rowKey={(t) => t.id} />
            </Card>
            <Pagination links={tickets.links} />

            <Drawer show={open} onClose={() => setOpen(false)} title="New Support Ticket" footer={<Button size="sm" loading={form.processing} onClick={submit}>Create ticket</Button>}>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="tenant_id" className="text-xs font-medium text-muted-foreground">Tenant</Label>
                        <select
                            id="tenant_id"
                            value={form.data.tenant_id}
                            onChange={(e) => form.setData('tenant_id', e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                        {form.errors.tenant_id && <span className="text-xs text-destructive">{form.errors.tenant_id}</span>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="subject" className="text-xs font-medium text-muted-foreground">Subject</Label>
                        <Input 
                            id="subject"
                            value={form.data.subject} 
                            placeholder="Brief description of the issue"
                            onChange={(e) => form.setData('subject', e.target.value)} 
                        />
                        {form.errors.subject && <span className="text-xs text-destructive">{form.errors.subject}</span>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="body" className="text-xs font-medium text-muted-foreground">Message</Label>
                        <Textarea 
                            id="body"
                            value={form.data.body} 
                            onChange={(e) => form.setData('body', e.target.value)} 
                            rows={5} 
                            placeholder="Detailed explanation of the issue or inquiry..."
                        />
                        {form.errors.body && <span className="text-xs text-destructive">{form.errors.body}</span>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="priority" className="text-xs font-medium text-muted-foreground">Priority</Label>
                        <select 
                            id="priority"
                            value={form.data.priority} 
                            onChange={(e) => form.setData('priority', e.target.value)} 
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {options.priorities.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
