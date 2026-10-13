import { Badge, Button, Card, CardBody, CardHeader, DataTable, Pagination, formatDate } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import { Textarea } from '@/Components/ui/Textarea';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { RotateCcw, AlertTriangle, Database } from 'lucide-react';

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
                <Link href={route('platform.restores.show', r.id)} className="font-medium text-foreground hover:text-primary hover:underline">
                    {r.tenant ?? `#${r.tenant_id}`}
                </Link>
            ),
        },
        { key: 'backup', label: 'Backup', render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.backup ?? '—'}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
        { key: 'verification_ok', label: 'Verification', render: (r) => (r.verification_ok === null ? '—' : <Badge tone={r.verification_ok ? 'success' : 'danger'}>{r.verification_ok ? 'Passed' : 'Warnings'}</Badge>) },
        { key: 'requested_by', label: 'Requested by', render: (r) => r.requested_by ?? '—' },
        { key: 'created_at', label: 'Requested', render: (r) => formatDate(r.created_at) },
    ];

    return (
        <PlatformLayout title="Restore Center">
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-2xs dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="leading-relaxed">
                    Restoring replaces a tenant's rows in the scoped tables. It is a logical, row-level restore — not point-in-time. The platform's and other tenants' records are left untouched, a pre-restore checkpoint is taken automatically, and the tenant identifier must be typed to execute.
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Restore History" description="Recent restoration tasks and audits" />
                    <CardBody>
                        <DataTable columns={columns} rows={restores.data} rowKey={(r) => r.id} empty={<p className="py-6 text-center text-sm text-muted-foreground">No restores recorded.</p>} />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Request a Restore" description="Only verified tenant backups can be restored" />
                    <CardBody>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="backup-select" className="text-xs font-medium text-muted-foreground">Tenant Backup</Label>
                                <select 
                                    id="backup-select"
                                    value={form.data.backup_id} 
                                    onChange={(e) => form.setData('backup_id', e.target.value)} 
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {candidates.map((candidate) => (
                                        <option key={candidate.value} value={candidate.value}>
                                            {candidate.label}
                                        </option>
                                    ))}
                                </select>
                                {candidates.length === 0 && <span className="text-xs text-muted-foreground">No verified tenant backups available.</span>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="restore-reason" className="text-xs font-medium text-muted-foreground">Reason</Label>
                                <Textarea 
                                    id="restore-reason"
                                    value={form.data.reason} 
                                    onChange={(e) => form.setData('reason', e.target.value)} 
                                    rows={3} 
                                    placeholder="Explain why this restore is requested..."
                                />
                                {form.errors.reason && <span className="text-xs text-destructive">{form.errors.reason}</span>}
                            </div>

                            <Button type="submit" size="sm" loading={form.processing} disabled={candidates.length === 0} className="w-full">
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
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
