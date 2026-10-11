import { Badge, Button, Card, CardBody, CardHeader, DataTable, Pagination, formatDate } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface RestoreRow {
    id: number;
    tenant: string | null;
    tenant_id: number;
    backup: string | null;
    reason: string;
    status: string;
    requested_by: string | null;
    approved_by: string | null;
    verification_ok: boolean | null;
    created_at: string | null;
    completed_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = { completed: 'success', failed: 'danger', running: 'warning', approved: 'info', pending: 'warning' };

export default function RestoreIndex({ restores, candidates }: { restores: Paginated<RestoreRow>; candidates: { value: string; label: string }[] }) {
    const form = useForm({ backup_id: candidates[0]?.value ?? '', reason: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('platform.restores.store'), { preserveScroll: true, onSuccess: () => form.reset('reason') });
    };

    const columns: Column<RestoreRow>[] = [
        {
            key: 'tenant',
            label: 'Tenant',
            render: (r) => (
                <Link href={route('platform.restores.show', r.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                    {r.tenant ?? `#${r.tenant_id}`}
                </Link>
            ),
        },
        { key: 'backup', label: 'Backup', render: (r) => <span className="font-mono text-xs text-gray-500">{r.backup ?? '—'}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
        { key: 'verification_ok', label: 'Verification', render: (r) => (r.verification_ok === null ? '—' : <Badge tone={r.verification_ok ? 'success' : 'danger'}>{r.verification_ok ? 'ok' : 'warnings'}</Badge>) },
        { key: 'requested_by', label: 'Requested by', render: (r) => r.requested_by ?? '—' },
        { key: 'created_at', label: 'Requested', render: (r) => formatDate(r.created_at) },
    ];

    return (
        <PlatformLayout title="Restore Center">
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Restoring replaces a tenant's rows in the scoped tables. It is a logical, row-level restore — not point-in-time. The platform's and other tenants' records are left untouched, a pre-restore checkpoint is taken automatically, and the tenant identifier must be typed to execute.
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Restore history" />
                    <CardBody>
                        <DataTable columns={columns} rows={restores.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-gray-500">No restores recorded.</p>} />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Request a restore" description="Only verified tenant backups can be restored" />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Backup</span>
                                <select value={form.data.backup_id} onChange={(e) => form.setData('backup_id', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm">
                                    {candidates.map((candidate) => (
                                        <option key={candidate.value} value={candidate.value}>
                                            {candidate.label}
                                        </option>
                                    ))}
                                </select>
                                {candidates.length === 0 && <span className="text-xs text-gray-400">No verified tenant backups available.</span>}
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-gray-500">Reason</span>
                                <textarea value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} rows={3} className="block w-full rounded-md border-gray-300 text-sm" />
                                {form.errors.reason && <span className="text-xs text-red-600">{form.errors.reason}</span>}
                            </label>
                            <Button type="submit" size="sm" loading={form.processing} disabled={candidates.length === 0}>
                                Request restore
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>

            <Pagination links={restores.links} />
        </PlatformLayout>
    );
}
