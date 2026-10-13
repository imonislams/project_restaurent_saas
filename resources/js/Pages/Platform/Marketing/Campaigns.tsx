import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    ConfirmDialog,
    Drawer,
    EmptyState,
    SelectField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TextField,
    TextareaField,
    formatDateTime,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Row {
    id: number;
    name: string;
    subject: string;
    body: string;
    audience: { status?: string; plan?: string };
    status: string;
    recipients_count: number;
    sent_at: string | null;
    audience_size: number;
}

interface Option {
    value: string;
    label: string;
}

const tone = (status: string): BadgeTone => (status === 'sent' ? 'success' : status === 'queued' ? 'info' : 'neutral');

export default function Campaigns({ campaigns, options }: { campaigns: { data: Row[] }; options: { statuses: Option[]; plans: Option[] } }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row | null>(null);
    const [confirmSend, setConfirmSend] = useState<Row | null>(null);

    const form = useForm({ name: '', subject: '', body: '', audience: { status: '', plan: '' } as { status?: string; plan?: string } });

    const openCreate = () => {
        setEditing(null);
        form.setData({ name: '', subject: '', body: '', audience: { status: '', plan: '' } });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (row: Row) => {
        setEditing(row);
        form.setData({ name: row.name, subject: row.subject, body: row.body, audience: { status: row.audience?.status ?? '', plan: row.audience?.plan ?? '' } });
        form.clearErrors();
        setOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = { ...form.data, audience: { status: form.data.audience.status || null, plan: form.data.audience.plan || null } };
        form.transform(() => payload);
        if (editing) {
            form.put(route('platform.marketing.campaigns.update', editing.id), { preserveScroll: true, onSuccess: () => setOpen(false) });
        } else {
            form.post(route('platform.marketing.campaigns.store'), { preserveScroll: true, onSuccess: () => setOpen(false) });
        }
    };

    const send = () => {
        if (!confirmSend) return;
        router.post(route('platform.marketing.campaigns.send', confirmSend.id), {}, { preserveScroll: true, onFinish: () => setConfirmSend(null) });
    };

    const statusOptions = [{ value: '', label: 'Any status' }, ...options.statuses];
    const planOptions = [{ value: '', label: 'Any plan' }, ...options.plans];

    return (
        <PlatformLayout
            title="Campaigns"
            description="Compose and send email campaigns to tenants by plan or status. Delivery is queued and recorded in the email log."
            actions={<Button onClick={openCreate}>New campaign</Button>}
        >
            <Card>
                <CardHeader title="Campaigns" description={`${campaigns.data.length} shown`} />
                <CardBody className="p-0">
                    {campaigns.data.length === 0 ? (
                        <div className="p-5">
                            <EmptyState title="No campaigns yet" description="Create your first campaign to email a segment of tenants." action={<Button onClick={openCreate}>New campaign</Button>} />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaign Name & Subject</TableHead>
                                    <TableHead>Target Audience</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Recipients</TableHead>
                                    <TableHead>Sent At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campaigns.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <div className="font-semibold text-foreground text-xs">{row.name}</div>
                                            <div className="text-xs text-muted-foreground">{row.subject}</div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {[row.audience?.status, row.audience?.plan].filter(Boolean).join(' · ') || 'All tenants'}
                                            <span className="ml-1.5 font-mono text-[11px] text-muted-foreground/80">≈{row.audience_size}</span>
                                        </TableCell>
                                        <TableCell><Badge tone={tone(row.status)}>{row.status}</Badge></TableCell>
                                        <TableCell className="text-right tabular-nums text-xs font-semibold text-foreground">{row.recipients_count}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{row.sent_at ? formatDateTime(row.sent_at) : '—'}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <Button size="xs" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                                                {row.status !== 'sent' && <Button size="xs" variant="outline" onClick={() => setConfirmSend(row)}>Send</Button>}
                                                <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => router.delete(route('platform.marketing.campaigns.destroy', row.id), { preserveScroll: true })}>Delete</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardBody>
            </Card>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Edit campaign' : 'New campaign'}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button loading={form.processing} onClick={submit}>{editing ? 'Save' : 'Create draft'}</Button>
                    </div>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <TextField label="Name" value={form.data.name} error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                    <TextField label="Subject" value={form.data.subject} error={form.errors.subject} onChange={(v) => form.setData('subject', v)} />
                    <TextareaField label="Body (HTML)" value={form.data.body} rows={10} error={form.errors.body} onChange={(v) => form.setData('body', v)} />
                    <div className="grid grid-cols-2 gap-3">
                        <SelectField label="Tenant status" value={form.data.audience.status ?? ''} options={statusOptions} onChange={(v) => form.setData('audience', { ...form.data.audience, status: v })} />
                        <SelectField label="Plan" value={form.data.audience.plan ?? ''} options={planOptions} onChange={(v) => form.setData('audience', { ...form.data.audience, plan: v })} />
                    </div>
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmSend !== null}
                title={`Send "${confirmSend?.name ?? ''}"?`}
                description={`This queues the campaign to approximately ${confirmSend?.audience_size ?? 0} tenant owner(s).`}
                confirmLabel="Queue send"
                tone="primary"
                onConfirm={send}
                onClose={() => setConfirmSend(null)}
            />
        </PlatformLayout>
    );
}
