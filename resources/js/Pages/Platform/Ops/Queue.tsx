import { Button, Card, CardBody, CardHeader, EmptyState, KpiCard, Pagination } from '@/Components/ui';
import type { PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';

interface FailedJob {
    id: string;
    queue: string;
    failed_at: string | null;
    exception: string;
}

export default function OpsQueue({
    queued_total,
    queued_by_queue,
    pending_batches,
    failed,
}: {
    queued_total: number;
    queued_by_queue: { queue: string; total: number }[];
    pending_batches: number;
    failed: { data: FailedJob[]; links: PageLink[] };
}) {
    return (
        <PlatformLayout title="Queue Monitoring">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KpiCard label="Queued jobs" value={queued_total} hint="Waiting to be processed" />
                <KpiCard label="Pending batches" value={pending_batches} hint="Incomplete job batches" />
                <KpiCard label="Failed jobs" value={failed.data.length} tone={failed.data.length > 0 ? 'danger' : 'neutral'} hint="On this page" />
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Queued by queue" />
                    <CardBody className="space-y-1.5">
                        {queued_by_queue.map((row) => (
                            <div key={row.queue} className="flex justify-between text-sm">
                                <span className="text-gray-600">{row.queue}</span>
                                <span className="font-medium text-gray-800">{row.total}</span>
                            </div>
                        ))}
                        {queued_by_queue.length === 0 && <p className="text-sm text-gray-500">No queued jobs.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="Failed jobs"
                        action={
                            failed.data.length > 0 ? (
                                <Button size="sm" variant="secondary" href={undefined} onClick={() => router.post(route('platform.ops.failed-jobs.retry-all'), {}, { preserveScroll: true })}>
                                    Retry all
                                </Button>
                            ) : undefined
                        }
                    />
                    <CardBody className="space-y-3">
                        {failed.data.map((job) => (
                            <div key={job.id} className="rounded-lg border border-border bg-card p-3 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-foreground">{job.queue}</span>
                                    <div className="flex gap-2.5 text-xs">
                                        <button onClick={() => router.post(route('platform.ops.failed-jobs.retry', job.id), {}, { preserveScroll: true })} className="font-medium text-primary hover:underline">
                                            Retry
                                        </button>
                                        <button onClick={() => router.delete(route('platform.ops.failed-jobs.destroy', job.id), { preserveScroll: true })} className="font-medium text-destructive hover:underline">
                                            Forget
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-1.5 line-clamp-2 font-mono text-[11px] text-muted-foreground">{job.exception}</p>
                            </div>
                        ))}
                        {failed.data.length === 0 && <EmptyState title="No failed jobs" description="Nothing needs attention right now." />}
                    </CardBody>
                </Card>
            </div>

            <Pagination links={failed.links} />
            <p className="mt-2 text-xs text-muted-foreground">
                Retrying a job re-queues it as-is. Financial, email and webhook jobs are idempotent, so a retry cannot double-apply a charge.
            </p>
        </PlatformLayout>
    );
}
