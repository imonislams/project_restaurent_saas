import { Alert, Card, CardBody, CardHeader, DataTable, EmptyState } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatNumber } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head } from '@inertiajs/react';

interface SourceRow {
    source: string;
    channel: string;
    total: number;
    converted: number;
    rate: number;
}

interface CampaignRow {
    campaign: string;
    total: number;
    converted: number;
}

export default function LeadSources({ rows, byCampaign }: { rows: SourceRow[]; byCampaign: CampaignRow[] }) {
    const sourceColumns: Column<SourceRow>[] = [
        { key: 'source', label: 'Source' },
        { key: 'channel', label: 'Channel', render: (row) => <span className="text-xs">{row.channel}</span> },
        { key: 'total', label: 'Leads', align: 'right', render: (row) => formatNumber(row.total) },
        { key: 'converted', label: 'Converted', align: 'right', render: (row) => formatNumber(row.converted) },
        { key: 'rate', label: 'Rate', align: 'right', render: (row) => `${row.rate}%` },
    ];

    return (
        <PlatformLayout title="Sources & conversion" description="Which channels actually produce paying restaurants.">
            <Head title="Lead sources" />

            <Alert variant="info" title="Simple counts, not attribution models">
                These are the source recorded on each lead and whether that lead was linked to a customer. Channel and
                campaign revenue attribution lives under Revenue Attribution, where the model and window are stated.
            </Alert>

            <Card>
                <CardHeader title="By source and channel" />
                <CardBody className="p-0">
                    <DataTable columns={sourceColumns} rows={rows} rowKey={(row) => row.source + row.channel} empty={<EmptyState title="No leads yet" />} />
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="By campaign" description="Only leads captured with a campaign link." />
                <CardBody className="p-0">
                    <DataTable
                        columns={[
                            { key: 'campaign', label: 'Campaign' },
                            { key: 'total', label: 'Leads', align: 'right', render: (row) => formatNumber(row.total) },
                            { key: 'converted', label: 'Converted', align: 'right', render: (row) => formatNumber(row.converted) },
                        ]}
                        rows={byCampaign}
                        rowKey={(row) => row.campaign}
                        empty={<EmptyState title="No campaign-attributed leads" description="A lead is linked when its UTM campaign matches a campaign." />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
