import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, TextField, formatDateTime } from '@/Components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Terminal, Play, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Action {
    key: string;
    label: string;
    command: string;
    danger: boolean;
}

interface Run {
    id: number;
    command: string;
    type: string;
    status: string;
    exit_code: number | null;
    duration_ms: number | null;
    output: string | null;
    user: string | null;
    created_at: string | null;
}

export default function Commands({
    curated,
    advanced,
    runs,
}: {
    curated: Action[];
    advanced: { enabled: boolean; is_super_admin: boolean; allowed_prefixes: string[] };
    runs: Run[];
}) {
    const [confirm, setConfirm] = useState<Action | null>(null);
    const [selected, setSelected] = useState<Run | null>(runs[0] ?? null);
    const form = useForm({ command: '' });

    const run = (action: Action) => {
        router.post(route('platform.commands.run', undefined), { key: action.key }, { preserveScroll: true, onFinish: () => setConfirm(null) });
    };

    const runAdvanced = () => {
        form.post(route('platform.commands.advanced', undefined), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    const terminalReady = advanced.enabled && advanced.is_super_admin;

    return (
        <PlatformLayout
            title="Command Runner"
            description="Run curated maintenance commands, and — for super admins with the terminal flag on — advanced artisan/npm commands. Every run is recorded and audited."
        >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Safe Actions" description="Curated and whitelisted maintenance commands" />
                    <CardBody>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {curated.map((action) => (
                                <button
                                    key={action.key}
                                    type="button"
                                    onClick={() => (action.danger ? setConfirm(action) : run(action))}
                                    className="group flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 text-left transition hover:border-primary/50 hover:bg-muted/40 shadow-2xs"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                                        {action.danger ? (
                                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                        ) : (
                                            <Play className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                                        )}
                                    </div>
                                    <span className="mt-1 font-mono text-xs text-muted-foreground">{action.command}</span>
                                </button>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Advanced Terminal" description={terminalReady ? 'Super admin access' : 'Disabled'} />
                    <CardBody className="space-y-3">
                        {terminalReady ? (
                            <>
                                <TextField
                                    label="Command"
                                    value={form.data.command}
                                    error={form.errors.command}
                                    placeholder="php artisan route:list"
                                    hint={`Allowed prefixes: ${advanced.allowed_prefixes.join(', ')}`}
                                    onChange={(v) => form.setData('command', v)}
                                    onEnter={runAdvanced}
                                />
                                <Button size="sm" loading={form.processing} onClick={runAdvanced}>
                                    <Terminal className="mr-1.5 h-3.5 w-3.5" />
                                    Run command
                                </Button>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {advanced.is_super_admin
                                    ? 'Enable “Advanced command terminal” in Feature Flags to use this.'
                                    : 'Only the SaaS super admin can run free-text commands.'}
                            </p>
                        )}
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-5">
                <CardHeader title="Recent Runs" description={`${runs.length} most recent executions`} />
                <CardBody className="p-0">
                    {runs.length === 0 ? (
                        <div className="p-6"><EmptyState title="No commands run yet" description="Run an action above; its output will appear here." /></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Command</TableHead>
                                            <TableHead>Result</TableHead>
                                            <TableHead>When</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {runs.map((run) => (
                                            <TableRow 
                                                key={run.id} 
                                                onClick={() => setSelected(run)} 
                                                className={`cursor-pointer transition-colors ${selected?.id === run.id ? 'bg-muted/70 font-medium' : ''}`}
                                            >
                                                <TableCell className="py-2.5">
                                                    <div className="font-mono text-xs text-foreground font-semibold">{run.command}</div>
                                                    <div className="text-[11px] text-muted-foreground">{run.user ?? 'system'} · {run.duration_ms}ms</div>
                                                </TableCell>
                                                <TableCell className="py-2.5">
                                                    <Badge tone={run.status === 'completed' ? 'success' : 'danger'}>
                                                        Exit: {run.exit_code ?? 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2.5 text-xs text-muted-foreground">{run.created_at ? formatDateTime(run.created_at) : '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="border-t border-border lg:border-l lg:border-t-0 flex flex-col bg-muted/10">
                                <div className="border-b border-border bg-muted/40 px-4 py-2 font-mono text-xs font-medium text-foreground flex items-center justify-between">
                                    <span>{selected?.command ?? 'Select a run'}</span>
                                    {selected && <span className="text-[11px] text-muted-foreground">{selected.duration_ms}ms</span>}
                                </div>
                                <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-foreground leading-relaxed flex-1">
                                    {selected?.output || '(no output)'}
                                </pre>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            <ConfirmDialog
                show={confirm !== null}
                title={`Run "${confirm?.label ?? ''}"?`}
                description={confirm?.command}
                confirmLabel="Run command"
                onConfirm={() => confirm && run(confirm)}
                onClose={() => setConfirm(null)}
            />
        </PlatformLayout>
    );
}
