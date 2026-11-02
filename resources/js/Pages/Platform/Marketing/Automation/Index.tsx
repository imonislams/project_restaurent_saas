import { Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, EmptyState, SelectField, TextField } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Step {
    id: number;
    type: string;
    template_key: string | null;
    delay_value: number | null;
    delay_unit: string | null;
}

interface AutomationRow {
    id: number;
    name: string;
    key: string;
    description: string | null;
    trigger_label: string;
    status: string;
    is_system: boolean;
    steps: Step[];
    enrollments: number;
    last_run_at: string | null;
}

export default function Automations({
    automations,
    triggers,
    logs,
}: {
    automations: AutomationRow[];
    triggers: Array<{ value: string; label: string }>;
    stepTypes: Array<{ value: string; label: string }>;
    logs: Array<{ id: number; status: string; message: string | null; step: string | null; executed_at: string | null }>;
}) {
    const [name, setName] = useState('');
    const [trigger, setTrigger] = useState(triggers[0]?.value ?? '');
    const [delay, setDelay] = useState('0');

    const logColumns: Column<{ id: number; status: string; message: string | null; step: string | null; executed_at: string | null }>[] = [
        { key: 'status', label: 'Result' },
        { key: 'step', label: 'Step', render: (row) => <span className="text-xs">{row.step ?? '—'}</span> },
        { key: 'message', label: 'Detail', render: (row) => <span className="text-xs text-muted-foreground">{row.message ?? '—'}</span> },
        { key: 'executed_at', label: 'When', render: (row) => <span className="text-xs">{row.executed_at ? formatDateTime(row.executed_at) : '—'}</span> },
    ];

    return (
        <PlatformLayout
            title="Automation workflows"
            description="Trigger → delay → email. A workflow only runs while it is active."
            actions={
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => router.post(route('platform.marketing.automation.workflows.run'), {}, { preserveScroll: true })}>
                        Run due steps now
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => router.post(route('platform.marketing.automation.workflows.presets'), {}, { preserveScroll: true })}>
                        Restore built-in sequences
                    </Button>
                </div>
            }
        >
            <Head title="Automation workflows" />

            <Alert variant="info" title="Saving never starts mailing">
                Workflows are created as drafts. Built-in sequences arrive as drafts too. Only <strong>Activate</strong> makes
                one live, and every step re-checks suppression and consent before it sends.
            </Alert>

            {automations.length === 0 ? (
                <EmptyState title="No workflows" description="Restore the built-in sequences, or create one below." />
            ) : (
                automations.map((automation) => (
                    <Card key={automation.id}>
                        <CardHeader
                            title={
                                <span className="flex flex-wrap items-center gap-2">
                                    {automation.name}
                                    <Badge tone={automation.status === 'active' ? 'success' : 'neutral'}>{automation.status}</Badge>
                                    {automation.is_system && <Badge tone="neutral">built-in</Badge>}
                                </span>
                            }
                            description={`${automation.trigger_label} · ${automation.steps.length} step(s) · ${automation.enrollments} enrolled`}
                            action={
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="xs"
                                        variant={automation.status === 'active' ? 'secondary' : 'primary'}
                                        onClick={() => router.post(route('platform.marketing.automation.workflows.toggle', automation.id), {}, { preserveScroll: true })}
                                    >
                                        {automation.status === 'active' ? 'Pause' : 'Activate'}
                                    </Button>
                                    {!automation.is_system && (
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                if (window.confirm(`Delete ${automation.name}?`)) {
                                                    router.delete(route('platform.marketing.automation.workflows.destroy', automation.id), { preserveScroll: true });
                                                }
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                        <CardBody className="space-y-2">
                            <ol className="space-y-1 text-xs">
                                {automation.steps.map((step, index) => (
                                    <li key={step.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2 py-1.5">
                                        <span className="font-mono text-muted-foreground">{index + 1}</span>
                                        <span className="font-medium text-foreground">{step.type}</span>
                                        {step.template_key && <span className="text-muted-foreground">{step.template_key}</span>}
                                        {step.delay_value ? (
                                            <span className="text-muted-foreground">after {step.delay_value} {step.delay_unit}</span>
                                        ) : (
                                            <span className="text-muted-foreground">immediately</span>
                                        )}
                                    </li>
                                ))}
                            </ol>
                            {automation.last_run_at && (
                                <p className="text-xs text-muted-foreground">Last ran {formatDateTime(automation.last_run_at)}</p>
                            )}
                        </CardBody>
                    </Card>
                ))
            )}

            <Card>
                <CardHeader title="New workflow" description="Created as a draft with one email step — add detail after." />
                <CardBody className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <TextField label="Name" value={name} onChange={setName} />
                        <SelectField label="Trigger" value={trigger} options={triggers} onChange={setTrigger} />
                        <TextField label="Delay (days)" value={delay} onChange={setDelay} />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            disabled={name.trim() === ''}
                            onClick={() =>
                                router.post(route('platform.marketing.automation.workflows.store'), { name, trigger, delay_value: Number(delay) || 0 }, {
                                    preserveScroll: true,
                                    onSuccess: () => { setName(''); setDelay('0'); },
                                })
                            }
                        >
                            Create workflow
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Recent step executions" description="Every attempt, including the ones a gate stopped." />
                <CardBody className="p-0">
                    <DataTable columns={logColumns} rows={logs} rowKey={(row) => row.id} empty={<EmptyState title="Nothing has run yet" />} />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
