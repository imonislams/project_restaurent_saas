import IntegrationCard, { ProviderRow } from '@/Components/Growth/IntegrationCard';
import { Alert, Card, CardBody, CardHeader, DataTable, EmptyState } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface SyncRow {
    entity: string;
    status: string;
    items: number;
    error: string | null;
    started_at: string | null;
    duration_ms: number | null;
}

interface Snapshot {
    at?: string;
    from?: string;
    to?: string;
    totals?: Record<string, number>;
    channels?: Array<{ label: string; sessions?: number; activeUsers?: number }>;
    landing_pages?: Array<{ label: string; screenPageViews?: number; activeUsers?: number }>;
    partial_failures?: string[];
}

export default function TrackingGoogle({
    analytics,
    tag_manager,
    snapshot,
    syncs,
}: {
    analytics: ProviderRow;
    tag_manager: ProviderRow;
    snapshot: Snapshot | null;
    syncs: SyncRow[];
}) {
    const [busy, setBusy] = useState<string | null>(null);

    const syncColumns: Column<SyncRow>[] = [
        { key: 'entity', label: 'Entity' },
        { key: 'status', label: 'Status' },
        { key: 'items', label: 'Rows', align: 'right' },
        {
            key: 'started_at',
            label: 'Started',
            render: (row) => (row.started_at ? formatDateTime(row.started_at) : '—'),
        },
        {
            key: 'error',
            label: 'Error',
            render: (row) => <span className="text-xs text-muted-foreground">{row.error ?? '—'}</span>,
        },
    ];

    return (
        <PlatformLayout
            title="Google Analytics & Tag Manager"
            description="GA4 reporting is read-only API data; the browser tag is what collects visits. Search Console and Google Ads live on their own screens."
        >
            <Head title="Google Analytics & Tag Manager" />

            <Alert variant="info" title="Configured is not the same as verified">
                A property is only readable once the connection test passes. Reporting figures below are a snapshot
                fetched at a point in time, never a live view — the timestamp says when.
            </Alert>

            <IntegrationCard row={analytics} busy={busy} onBusy={setBusy} />
            <IntegrationCard row={tag_manager} busy={busy} onBusy={setBusy} />

            <Card>
                <CardHeader
                    title="GA4 snapshot"
                    description={
                        snapshot?.at
                            ? `Fetched ${formatDateTime(snapshot.at)}${snapshot.from ? ` for ${snapshot.from} → ${snapshot.to}` : ''}.`
                            : 'No snapshot yet. Press Sync now on the analytics card once the connection is verified.'
                    }
                />
                <CardBody className="space-y-4 p-4">
                    {!snapshot ? (
                        <EmptyState
                            title="No reporting data"
                            description="GA4 data appears only after a successful sync. Nothing is estimated or filled in."
                        />
                    ) : (
                        <>
                            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                                {Object.entries(snapshot.totals ?? {}).map(([metric, value]) => (
                                    <div key={metric} className="rounded-lg border border-border bg-card p-3">
                                        <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                            {metric}
                                        </dt>
                                        <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
                                            {Number.isInteger(value) ? formatNumber(value) : value.toFixed(2)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

                            {snapshot.channels && snapshot.channels.length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Sessions by channel
                                    </h3>
                                    <ul className="divide-y divide-border text-sm">
                                        {snapshot.channels.map((row) => (
                                            <li key={row.label} className="flex items-center justify-between py-1.5">
                                                <span className="truncate text-foreground">{row.label}</span>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {formatNumber(row.sessions ?? 0)} sessions
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(snapshot.partial_failures ?? []).length > 0 && (
                                <Alert variant="warning" title="Some parts of this snapshot failed">
                                    <ul className="space-y-1">
                                        {(snapshot.partial_failures ?? []).map((line) => (
                                            <li key={line}>{line}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Sync history" description="Every attempt is recorded, successful or not." />
                <CardBody className="p-0">
                    <DataTable
                        columns={syncColumns}
                        rows={syncs}
                        rowKey={(row) => `${row.entity}-${row.started_at ?? row.status}`}
                        empty={<EmptyState title="No syncs yet" />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
