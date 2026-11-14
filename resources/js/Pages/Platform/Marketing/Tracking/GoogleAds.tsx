import IntegrationCard, { ProviderRow } from '@/Components/Growth/IntegrationCard';
import { Alert, Card, CardBody, CardHeader, DataTable, EmptyState } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime, formatMoney, formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface AdsCampaign {
    campaign_id: string | null;
    campaign_name: string | null;
    status: string | null;
    cost: number;
    clicks: number;
    impressions: number;
    ctr: number;
}

interface Snapshot {
    at?: string;
    from?: string;
    to?: string;
    currency?: string;
    campaigns?: AdsCampaign[];
    total_cost?: number;
}

export default function TrackingGoogleAds({
    integration,
    snapshot,
    syncs,
}: {
    integration: ProviderRow;
    snapshot: Snapshot | null;
    syncs: Array<{ entity: string; status: string; items: number; error: string | null; started_at: string | null }>;
}) {
    const [busy, setBusy] = useState<string | null>(null);

    const hasDeveloperToken = Boolean(
        integration.credentials.find((field) => field.key === 'developer_token')?.is_set,
    );

    const columns: Column<AdsCampaign>[] = [
        { key: 'campaign_name', label: 'Campaign', render: (row) => row.campaign_name ?? row.campaign_id ?? '—' },
        {
            key: 'cost',
            label: 'Cost',
            align: 'right',
            render: (row) => formatMoney(row.cost, snapshot?.currency ?? 'USD'),
        },
        { key: 'clicks', label: 'Clicks', align: 'right', render: (row) => formatNumber(row.clicks) },
        { key: 'impressions', label: 'Impressions', align: 'right', render: (row) => formatNumber(row.impressions) },
        { key: 'ctr', label: 'CTR', align: 'right', render: (row) => `${(row.ctr * 100).toFixed(2)}%` },
    ];

    return (
        <PlatformLayout
            title="Google Ads"
            description="Conversion tracking works without a developer token. Spend sync does not."
        >
            <Head title="Google Ads" />

            <Alert
                variant={hasDeveloperToken ? 'info' : 'warning'}
                title={hasDeveloperToken ? 'Developer token present' : 'Spend sync is off — no developer token'}
            >
                {hasDeveloperToken ? (
                    <p>
                        Spend is fetched from the Google Ads API and stored with the source <strong>google_ads</strong>. It
                        appears in reporting as live ad-platform data.
                    </p>
                ) : (
                    <p>
                        Google issues developer tokens after review, so until one is supplied spend is entered by hand and
                        every ROAS and CAC built on it is labelled <em>manually entered</em>. Conversion tracking is
                        configured separately and works without it.
                    </p>
                )}
            </Alert>

            <IntegrationCard row={integration} busy={busy} onBusy={setBusy} />

            <Card>
                <CardHeader
                    title="Campaign spend"
                    description={
                        snapshot?.at
                            ? `Fetched ${formatDateTime(snapshot.at)}${snapshot.from ? ` for ${snapshot.from} → ${snapshot.to}` : ''}.`
                            : 'No spend snapshot yet.'
                    }
                />
                <CardBody className="space-y-3 p-4">
                    {!snapshot ? (
                        <EmptyState
                            title="No spend data"
                            description="Nothing is shown until the Ads API supplies it. Manual spend is entered with the campaign, not here, so the two sources never blur together."
                        />
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Total recorded spend:{' '}
                                <span className="font-mono font-semibold text-foreground">
                                    {formatMoney(snapshot.total_cost ?? 0, snapshot.currency ?? 'USD')}
                                </span>{' '}
                                across {snapshot.campaigns?.length ?? 0} campaign(s).
                            </p>
                            <DataTable
                                columns={columns}
                                rows={snapshot.campaigns ?? []}
                                rowKey={(row) => String(row.campaign_id ?? row.campaign_name)}
                                empty={<EmptyState title="No campaigns with spend in range" />}
                            />
                        </>
                    )}
                </CardBody>
            </Card>

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
