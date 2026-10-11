import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, formatDate } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface RestoreView {
    id: number;
    tenant: string | null;
    tenant_slug: string | null;
    tenant_id: number;
    backup: string | null;
    checkpoint: string | null;
    reason: string;
    status: string;
    requested_by: string | null;
    approved_by: string | null;
    verification: { tables?: number; rows?: number; ok?: boolean; problems?: string[]; checked_at?: string } | null;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
}

const TONE: Record<string, BadgeTone> = { completed: 'success', failed: 'danger', running: 'warning', approved: 'info', pending: 'warning' };

export default function RestoreShow({ restore }: { restore: RestoreView }) {
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState('');
    const [processing, setProcessing] = useState(false);

    const execute = () => {
        setProcessing(true);
        router.post(route('platform.restores.execute', restore.id), { confirm }, { preserveScroll: true, onFinish: () => { setProcessing(false); setOpen(false); setConfirm(''); } });
    };

    const canExecute = restore.status === 'approved';

    return (
        <PlatformLayout title={`Restore #${restore.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900">{restore.tenant ?? `Tenant #${restore.tenant_id}`}</h1>
                        <Badge tone={TONE[restore.status] ?? 'neutral'}>{restore.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">Requested {formatDate(restore.created_at)} · reason: {restore.reason}</p>
                </div>
                <Button size="sm" variant="danger" disabled={!canExecute} onClick={() => setOpen(true)}>
                    Execute restore
                </Button>
            </div>

            {restore.error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{restore.error}</div>}

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Details" />
                    <CardBody>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Source backup</dt><dd className="font-mono text-xs">{restore.backup ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Pre-restore checkpoint</dt><dd className="font-mono text-xs">{restore.checkpoint ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Requested by</dt><dd>{restore.requested_by ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Approved / executed by</dt><dd>{restore.approved_by ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Started</dt><dd>{formatDate(restore.started_at)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Completed</dt><dd>{formatDate(restore.completed_at)}</dd></div>
                        </dl>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Post-restore verification" description="Row counts and tenant-isolation checks" />
                    <CardBody>
                        {restore.verification ? (
                            <dl className="space-y-1 text-sm">
                                <div className="flex justify-between"><dt className="text-gray-500">Isolation</dt><dd><Badge tone={restore.verification.ok ? 'success' : 'danger'}>{restore.verification.ok ? 'passed' : 'warnings'}</Badge></dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Tables restored</dt><dd>{restore.verification.tables ?? '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Rows restored</dt><dd>{restore.verification.rows ?? '—'}</dd></div>
                                {(restore.verification.problems ?? []).map((problem, i) => (
                                    <div key={i} className="text-xs text-red-600">{problem}</div>
                                ))}
                            </dl>
                        ) : (
                            <p className="text-sm text-gray-500">No verification recorded yet.</p>
                        )}
                    </CardBody>
                </Card>
            </div>

            <ConfirmDialog
                show={open}
                title={`Restore ${restore.tenant ?? 'tenant'}?`}
                description="This replaces the tenant's rows in the scoped tables. A checkpoint is taken first. Type the tenant identifier to confirm."
                confirmLabel="Execute restore"
                tone="danger"
                processing={processing}
                requireText={restore.tenant_slug ?? ''}
                onConfirm={execute}
                onClose={() => setOpen(false)}
            >
                <label className="text-xs font-medium text-gray-500">Typed confirmation</label>
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm" placeholder={restore.tenant_slug ?? ''} />
            </ConfirmDialog>
        </PlatformLayout>
    );
}
