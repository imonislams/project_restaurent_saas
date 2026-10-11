import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, TextField, formatDateTime } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

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
                    <CardHeader title="Safe actions" description="Whitelisted commands" />
                    <CardBody>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {curated.map((action) => (
                                <button
                                    key={action.key}
                                    onClick={() => (action.danger ? setConfirm(action) : run(action))}
                                    className="flex flex-col rounded-lg border border-gray-200 px-3 py-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
                                >
                                    <span className="text-sm font-medium text-gray-800">{action.label}</span>
                                    <span className="mt-0.5 font-mono text-[11px] text-gray-400">{action.command}</span>
                                </button>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Advanced terminal" description={terminalReady ? 'Super admin' : 'Disabled'} />
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
                                <Button size="sm" loading={form.processing} onClick={runAdvanced}>Run command</Button>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">
                                {advanced.is_super_admin
                                    ? 'Enable “Advanced command terminal” in Feature Flags to use this.'
                                    : 'Only the SaaS super admin can run free-text commands.'}
                            </p>
                        )}
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-5">
                <CardHeader title="Recent runs" description={`${runs.length} most recent`} />
                <CardBody className="p-0">
                    {runs.length === 0 ? (
                        <div className="p-5"><EmptyState title="No commands run yet" description="Run an action above; its output will appear here." /></div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3">Command</th>
                                        <th className="px-4 py-3">Result</th>
                                        <th className="px-4 py-3">When</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {runs.map((run) => (
                                        <tr key={run.id} onClick={() => setSelected(run)} className={'cursor-pointer hover:bg-gray-50 ' + (selected?.id === run.id ? 'bg-indigo-50/50' : '')}>
                                            <td className="px-4 py-2.5">
                                                <div className="font-mono text-xs text-gray-800">{run.command}</div>
                                                <div className="text-[11px] text-gray-400">{run.user ?? 'system'} · {run.duration_ms}ms</div>
                                            </td>
                                            <td className="px-4 py-2.5"><Badge tone={run.status === 'completed' ? 'success' : 'danger'}>{run.exit_code}</Badge></td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{run.created_at ? formatDateTime(run.created_at) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="border-t border-gray-100 lg:border-l lg:border-t-0">
                                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 font-mono text-xs text-gray-600">{selected?.command ?? 'Select a run'}</div>
                                <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-4 text-xs text-gray-700">{selected?.output ?? ''}</pre>
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
