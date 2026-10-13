import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, formatDate } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { Input } from '@/Components/ui/Input';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
                    <div className="flex items-center gap-2.5">
                        <Button variant="outline" size="sm" href={route('platform.restores.index')} className="h-8 px-2.5">
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                            Back
                        </Button>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">{restore.tenant ?? `Tenant #${restore.tenant_id}`}</h1>
                        <Badge tone={TONE[restore.status] ?? 'neutral'}>{restore.status}</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">Requested {formatDate(restore.created_at)} · Reason: {restore.reason}</p>
                </div>
                <Button size="sm" variant="danger" disabled={!canExecute} onClick={() => setOpen(true)}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Execute restore
                </Button>
            </div>

            {restore.error && (
                <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive shadow-2xs">
                    {restore.error}
                </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Restore Details" />
                    <CardBody>
                        <dl className="divide-y divide-border/50 text-sm">
                            <div className="flex justify-between py-2"><dt className="text-muted-foreground">Source backup</dt><dd className="font-mono text-xs text-foreground font-medium">{restore.backup ?? '—'}</dd></div>
                            <div className="flex justify-between py-2"><dt className="text-muted-foreground">Pre-restore checkpoint</dt><dd className="font-mono text-xs text-foreground font-medium">{restore.checkpoint ?? '—'}</dd></div>
                            <div className="flex justify-between py-2"><dt className="text-muted-foreground">Requested by</dt><dd className="font-medium text-foreground">{restore.requested_by ?? '—'}</dd></div>
                            <div className="flex justify-between py-2"><dt className="text-muted-foreground">Approved / executed by</dt><dd className="font-medium text-foreground">{restore.approved_by ?? '—'}</dd></div>
                            <div className="flex justify-between py-2"><dt className="text-muted-foreground">Started</dt><dd className="text-foreground">{formatDate(restore.started_at)}</dd></div>
                            <div className="flex justify-between py-2"><dt className="text-muted-foreground">Completed</dt><dd className="text-foreground">{formatDate(restore.completed_at)}</dd></div>
                        </dl>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Post-restore Verification" description="Row counts and tenant-isolation validations" />
                    <CardBody>
                        {restore.verification ? (
                            <dl className="divide-y divide-border/50 text-sm">
                                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Isolation check</dt><dd><Badge tone={restore.verification.ok ? 'success' : 'danger'}>{restore.verification.ok ? 'Passed' : 'Warnings'}</Badge></dd></div>
                                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Tables restored</dt><dd className="font-medium text-foreground">{restore.verification.tables ?? '—'}</dd></div>
                                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Rows restored</dt><dd className="font-medium text-foreground">{restore.verification.rows ?? '—'}</dd></div>
                                {(restore.verification.problems ?? []).map((problem, i) => (
                                    <div key={i} className="py-2 text-xs text-destructive">{problem}</div>
                                ))}
                            </dl>
                        ) : (
                            <p className="text-sm text-muted-foreground">No verification recorded yet.</p>
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
                <div className="space-y-1.5 pt-2">
                    <Label htmlFor="typed-confirm" className="text-xs font-medium text-muted-foreground">Typed confirmation</Label>
                    <Input 
                        id="typed-confirm"
                        value={confirm} 
                        onChange={(e) => setConfirm(e.target.value)} 
                        placeholder={restore.tenant_slug ?? ''} 
                    />
                </div>
            </ConfirmDialog>
        </PlatformLayout>
    );
}
