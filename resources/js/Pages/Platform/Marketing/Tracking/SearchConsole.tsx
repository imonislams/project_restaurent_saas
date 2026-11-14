import IntegrationCard, { ProviderRow } from '@/Components/Growth/IntegrationCard';
import { Alert, Card, CardBody, CardHeader, DataTable, EmptyState } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface GscRow {
    key: string | null;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface Snapshot {
    at?: string;
    from?: string;
    to?: string;
    summary?: { clicks?: number; impressions?: number; ctr?: number; position?: number } | null;
    queries?: GscRow[];
    pages?: GscRow[];
    countries?: GscRow[];
    partial_failures?: string[];
    data_lag_note?: string;
}

interface SyncRow {
    entity: string;
    status: string;
    items: number;
    error: string | null;
    started_at: string | null;
}

export default function TrackingSearchConsole({
    integration,
    snapshot,
    syncs,
}: {
    integration: ProviderRow;
    snapshot: Snapshot | null;
    syncs: SyncRow[];
}) {
    const [busy, setBusy] = useState<string | null>(null);

    const columns: Column<GscRow>[] = [
        { key: 'key', label: 'Query / page', render: (row) => row.key ?? '—' },
        { key: 'clicks', label: 'Clicks', align: 'right', render: (row) => formatNumber(row.clicks) },
        { key: 'impressions', label: 'Impressions', align: 'right', render: (row) => formatNumber(row.impressions) },
        { key: 'ctr', label: 'CTR', align: 'right', render: (row) => `${(row.ctr * 100).toFixed(1)}%` },
        { key: 'position', label: 'Position', align: 'right', render: (row) => row.position.toFixed(1) },
    ];

    return (
        <PlatformLayout
            title="Google Search Console"
            description="Search performance for the verified property. Figures are the API's own definitions, fetched at a point in time."
        >
            <Head title="Google Search Console" />

            <Alert variant="info" title="Search Console reports two to three days behind">
                These are the API's numbers, not a live view. The property string must match exactly —
                <code className="mx-1 font-mono text-[11px]">sc-domain:example.com</code> and
                <code className="mx-1 font-mono text-[11px]">https://example.com/</code> are different properties.
            </Alert>

            <IntegrationCard row={integration} busy={busy} onBusy={setBusy} />

            <Card>
                <CardHeader
                    title="Search performance"
                    description={
                        snapshot?.at
                            ? `Fetched ${formatDateTime(snapshot.at)}${snapshot.from ? ` for ${snapshot.from} → ${snapshot.to}` : ''}.`
                            : 'No snapshot yet. Press Sync now once the property is verified.'
                    }
                />
                <CardBody className="space-y-4 p-4">
                    {!snapshot ? (
                        <EmptyState
                            title="No search data"
                            description="Nothing is displayed until a sync succeeds. An unverified property produces no numbers at all rather than zeros that look like real performance."
                        />
                    ) : (
                        <>
                            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    ['Clicks', snapshot.summary?.clicks],
                                    ['Impressions', snapshot.summary?.impressions],
                                    ['CTR', snapshot.summary?.ctr !== undefined ? snapshot.summary.ctr * 100 : undefined],
                                    ['Avg position', snapshot.summary?.position],
                                ].map(([label, value]) => (
                                    <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
                                        <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                            {label}
                                        </dt>
                                        <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
                                            {value === undefined || value === null
                                                ? '—'
                                                : label === 'CTR'
                                                  ? `${Number(value).toFixed(1)}%`
                                                  : formatNumber(Number(value))}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

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

            {snapshot && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader title="Top queries" />
                        <CardBody className="p-0">
                            <DataTable columns={columns} rows={snapshot.queries ?? []} rowKey={(row) => 'q-' + (row.key ?? '')} empty={<EmptyState title="No queries in range" />} />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Top pages" />
                        <CardBody className="p-0">
                            <DataTable columns={columns} rows={snapshot.pages ?? []} rowKey={(row) => 'p-' + (row.key ?? '')} empty={<EmptyState title="No pages in range" />} />
                        </CardBody>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader title="Sync history" />
                <CardBody className="p-0">
                    <DataTable
                        columns={[
                            { key: 'entity', label: 'Entity' },
                            { key: 'status', label: 'Status' },
                            { key: 'items', label: 'Rows', align: 'right' },
                            { key: 'started_at', label: 'Started', render: (row) => (row.started_at ? formatDateTime(row.started_at) : '—') },
                            { key: 'error', label: 'Error', render: (row) => <span className="text-xs text-muted-foreground">{row.error ?? '—'}</span> },
                        ]}
                        rows={syncs}
                        rowKey={(row) => `${row.entity}-${row.started_at ?? row.status}`}
                        empty={<EmptyState title="No syncs yet" />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
