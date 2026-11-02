import { Alert, Button, Card, CardBody, CardHeader, DataTable, EmptyState } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head } from '@inertiajs/react';

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
}

export default function SeoPerformance({
    snapshot,
    connected,
    sitemapUrl,
}: {
    snapshot: Snapshot | null;
    connected: boolean;
    sitemapUrl: string;
}) {
    const columns: Column<GscRow>[] = [
        { key: 'key', label: 'Query', render: (row) => <span className="truncate text-sm">{row.key ?? '—'}</span> },
        { key: 'clicks', label: 'Clicks', align: 'right', render: (row) => formatNumber(row.clicks) },
        { key: 'impressions', label: 'Impressions', align: 'right', render: (row) => formatNumber(row.impressions) },
        { key: 'ctr', label: 'CTR', align: 'right', render: (row) => `${(row.ctr * 100).toFixed(1)}%` },
        { key: 'position', label: 'Position', align: 'right', render: (row) => row.position.toFixed(1) },
    ];

    return (
        <PlatformLayout
            title="SEO performance"
            description="Search Console figures for the verified property. Read-only API data, fetched at a point in time."
        >
            <Head title="SEO performance" />

            {!connected ? (
                <Alert variant="warning" title="Search Console is not connected">
                    <p>
                        This report reads the Search Console API for your verified property. Until that connection is
                        configured and verified, no figures exist — and none are invented.
                    </p>
                    <p className="mt-2">
                        <Button size="xs" variant="secondary" href={route('platform.marketing.integrations.index')}>
                            Configure Search Console
                        </Button>
                    </p>
                </Alert>
            ) : (
                <Alert variant="info" title="Data lags two to three days">
                    Search Console reports behind reality, and these figures use its own definitions. Submit{' '}
                    <code className="font-mono text-xs">{sitemapUrl}</code> in Search Console to feed it.
                </Alert>
            )}

            <Card>
                <CardHeader
                    title="Search performance"
                    description={
                        snapshot?.at
                            ? `Fetched ${formatDateTime(snapshot.at)}${snapshot.from ? ` for ${snapshot.from} → ${snapshot.to}` : ''}.`
                            : 'No snapshot yet.'
                    }
                    action={
                        connected ? (
                            <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => undefined}
                                href={route('platform.marketing.integrations.index')}
                            >
                                Sync from Integrations
                            </Button>
                        ) : undefined
                    }
                />
                <CardBody className="space-y-4 p-4">
                    {!snapshot ? (
                        <EmptyState
                            title="Nothing fetched yet"
                            description="Press Sync now on the Search Console integration once it is verified. Until then this report stays empty rather than guessing."
                        />
                    ) : (
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                ['Clicks', snapshot.summary?.clicks, 'number'],
                                ['Impressions', snapshot.summary?.impressions, 'number'],
                                ['CTR', snapshot.summary?.ctr, 'percent'],
                                ['Average position', snapshot.summary?.position, 'decimal'],
                            ].map(([label, value, format]) => (
                                <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
                                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                        {label}
                                    </dt>
                                    <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
                                        {value === undefined || value === null
                                            ? '—'
                                            : format === 'percent'
                                              ? `${(Number(value) * 100).toFixed(1)}%`
                                              : format === 'decimal'
                                                ? Number(value).toFixed(1)
                                                : formatNumber(Number(value))}
                                    </dd>
                                </div>
                            ))}
                        </dl>
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
                            <DataTable
                                columns={[{ ...columns[0], label: 'Page' }, ...columns.slice(1)]}
                                rows={snapshot.pages ?? []}
                                rowKey={(row) => 'p-' + (row.key ?? '')}
                                empty={<EmptyState title="No pages in range" />}
                            />
                        </CardBody>
                    </Card>
                </div>
            )}
        </PlatformLayout>
    );
}
