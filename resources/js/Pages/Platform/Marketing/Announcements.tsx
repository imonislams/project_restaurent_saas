import { Badge, Button, Card, CardBody, CardHeader, CheckboxField, ConfirmDialog, Drawer, EmptyState, SelectField, TextField, TextareaField, formatDateTime } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Row {
    id: number;
    title: string;
    body: string;
    level: 'info' | 'warning' | 'critical';
    audience: { status?: string; plan?: string };
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    live: boolean;
}

interface Option {
    value: string;
    label: string;
}

const tone = (level: string): BadgeTone => (level === 'critical' ? 'danger' : level === 'warning' ? 'warning' : 'info');

export default function Announcements({ announcements, options }: { announcements: Row[]; options: { statuses: Option[]; plans: Option[] } }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Row | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

    const form = useForm({
        title: '',
        body: '',
        level: 'info',
        audience: { status: '', plan: '' } as { status?: string; plan?: string },
        is_active: true,
        starts_at: '',
        ends_at: '',
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({ title: '', body: '', level: 'info', audience: { status: '', plan: '' }, is_active: true, starts_at: '', ends_at: '' });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (row: Row) => {
        setEditing(row);
        form.setData({
            title: row.title,
            body: row.body,
            level: row.level,
            audience: { status: row.audience?.status ?? '', plan: row.audience?.plan ?? '' },
            is_active: row.is_active,
            starts_at: row.starts_at ? row.starts_at.slice(0, 10) : '',
            ends_at: row.ends_at ? row.ends_at.slice(0, 10) : '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const payload = {
            ...form.data,
            audience: { status: form.data.audience.status || null, plan: form.data.audience.plan || null },
            starts_at: form.data.starts_at || null,
            ends_at: form.data.ends_at || null,
        };
        form.transform(() => payload);
        if (editing) {
            form.put(route('platform.marketing.announcements.update', editing.id), { preserveScroll: true, onSuccess: () => setOpen(false) });
        } else {
            form.post(route('platform.marketing.announcements.store'), { preserveScroll: true, onSuccess: () => setOpen(false) });
        }
    };

    const statusOptions = [{ value: '', label: 'Any status' }, ...options.statuses];
    const planOptions = [{ value: '', label: 'Any plan' }, ...options.plans];
    const levelOptions = [
        { value: 'info', label: 'Info' },
        { value: 'warning', label: 'Warning' },
        { value: 'critical', label: 'Critical' },
    ];

    return (
        <PlatformLayout
            title="Announcements"
            description="Short in-app messages shown to tenants while active. Target by plan or status."
            actions={<Button onClick={openCreate}>New announcement</Button>}
        >
            <Card>
                <CardHeader title="Announcements" description={`${announcements.length} total`} />
                <CardBody className="p-0">
                    {announcements.length === 0 ? (
                        <div className="p-5">
                            <EmptyState title="No announcements" description="Create an announcement to notify tenants in-app." action={<Button onClick={openCreate}>New announcement</Button>} />
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-5 py-3">Title</th>
                                    <th className="px-5 py-3">Level</th>
                                    <th className="px-5 py-3">Audience</th>
                                    <th className="px-5 py-3">Window</th>
                                    <th className="px-5 py-3">State</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {announcements.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-gray-900">{row.title}</div>
                                            <div className="truncate text-xs text-gray-400" style={{ maxWidth: 320 }}>{row.body}</div>
                                        </td>
                                        <td className="px-5 py-3"><Badge tone={tone(row.level)}>{row.level}</Badge></td>
                                        <td className="px-5 py-3 text-gray-600">{[row.audience?.status, row.audience?.plan].filter(Boolean).join(' · ') || 'All tenants'}</td>
                                        <td className="px-5 py-3 text-xs text-gray-500">
                                            {row.starts_at ? formatDateTime(row.starts_at) : '—'} → {row.ends_at ? formatDateTime(row.ends_at) : '∞'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge tone={row.live ? 'success' : 'neutral'}>{row.live ? 'live' : row.is_active ? 'scheduled' : 'off'}</Badge>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button size="xs" variant="ghost" onClick={() => router.post(route('platform.marketing.announcements.toggle', row.id), {}, { preserveScroll: true })}>
                                                    {row.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button size="xs" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>
                                                <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(row)}>Delete</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardBody>
            </Card>

            <Drawer
                show={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Edit announcement' : 'New announcement'}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button loading={form.processing} onClick={submit}>{editing ? 'Save' : 'Create'}</Button>
                    </div>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <TextField label="Title" value={form.data.title} error={form.errors.title} onChange={(v) => form.setData('title', v)} />
                    <TextareaField label="Message" value={form.data.body} rows={4} error={form.errors.body} onChange={(v) => form.setData('body', v)} />
                    <SelectField label="Level" value={form.data.level} options={levelOptions} onChange={(v) => form.setData('level', v)} />
                    <div className="grid grid-cols-2 gap-3">
                        <SelectField label="Tenant status" value={form.data.audience.status ?? ''} options={statusOptions} onChange={(v) => form.setData('audience', { ...form.data.audience, status: v })} />
                        <SelectField label="Plan" value={form.data.audience.plan ?? ''} options={planOptions} onChange={(v) => form.setData('audience', { ...form.data.audience, plan: v })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <TextField label="Starts at" type="date" value={form.data.starts_at} error={form.errors.starts_at} onChange={(v) => form.setData('starts_at', v)} />
                        <TextField label="Ends at" type="date" value={form.data.ends_at} error={form.errors.ends_at} onChange={(v) => form.setData('ends_at', v)} />
                    </div>
                    <CheckboxField label="Active" checked={form.data.is_active} onChange={(v) => form.setData('is_active', v)} hint="Inactive announcements are never shown." />
                </form>
            </Drawer>

            <ConfirmDialog
                show={confirmDelete !== null}
                title={`Delete "${confirmDelete?.title ?? ''}"?`}
                confirmLabel="Delete"
                onConfirm={() => {
                    if (confirmDelete) router.delete(route('platform.marketing.announcements.destroy', confirmDelete.id), { preserveScroll: true, onFinish: () => setConfirmDelete(null) });
                }}
                onClose={() => setConfirmDelete(null)}
            />
        </PlatformLayout>
    );
}
