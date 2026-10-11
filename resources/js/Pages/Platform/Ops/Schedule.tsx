import { Badge, Card, CardBody, CardHeader, DataTable } from '@/Components/ui';
import type { BadgeTone, Column } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

interface Event {
    command: string;
    expression: string;
    description: string | null;
    next_run: string | null;
}

interface Run {
    task: string;
    ran_at: string | null;
    duration_ms: number | null;
    exit_code: number | null;
    output: string | null;
}

export default function OpsSchedule({ events, runs }: { events: Event[]; runs: Run[] }) {
    const columns: Column<Run>[] = [
        { key: 'task', label: 'Task', render: (r) => <span className="font-mono text-xs">{r.task}</span> },
        { key: 'ran_at', label: 'Ran at', render: (r) => (r.ran_at ? new Date(r.ran_at).toLocaleString() : '—') },
        { key: 'duration_ms', label: 'Duration', align: 'right', render: (r) => (r.duration_ms !== null ? `${r.duration_ms} ms` : '—') },
        { key: 'exit_code', label: 'Result', render: (r) => <Badge tone={(r.exit_code ?? 0) === 0 ? 'success' : 'danger'}>{(r.exit_code ?? 0) === 0 ? 'OK' : 'Failed'}</Badge> },
        { key: 'output', label: 'Output', render: (r) => <span className="text-xs text-gray-500">{r.output ? r.output.slice(0, 80) : '—'}</span> },
    ];

    return (
        <PlatformLayout title="Scheduled Tasks">
            <Card className="mb-5">
                <CardHeader title="Schedule" description="Configured recurring tasks (a schedule is not proof of execution)" />
                <CardBody className="space-y-2">
                    {events.map((event, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0">
                                <div className="truncate font-mono text-xs text-gray-700">{event.command}</div>
                                <div className="text-xs text-gray-400">{event.description ?? event.expression}</div>
                            </div>
                            <span className="shrink-0 text-xs text-gray-400">{event.next_run ? `next: ${new Date(event.next_run).toLocaleString()}` : ''}</span>
                        </div>
                    ))}
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Recent executions" description="Recorded by the scheduler event listener" />
                <CardBody>
                    <DataTable columns={columns} rows={runs} rowKey={(r) => `${r.task}-${r.ran_at}`} empty={<p className="py-6 text-center text-sm text-gray-500">No scheduled task runs recorded yet.</p>} />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
