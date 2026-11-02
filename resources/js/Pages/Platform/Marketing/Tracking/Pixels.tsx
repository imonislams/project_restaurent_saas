import IntegrationCard, { ProviderRow } from '@/Components/Growth/IntegrationCard';
import { Alert, Card, CardBody, CardHeader, DataTable, EmptyState, Tabs } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { formatDateTime } from '@/Components/ui/Money';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface CatalogueEntry {
    value: string;
    label: string;
    category: string;
    meta_event: string | null;
    monetary: boolean;
}

interface Delivery {
    event: string | null;
    event_id: string;
    status: string;
    attempts: number;
    http_status: number | null;
    error: string | null;
    sent_at: string | null;
    created_at: string | null;
}

export default function TrackingPixels({
    meta_pixel,
    meta_conversions,
    catalogue,
    deliveries,
}: {
    meta_pixel: ProviderRow;
    meta_conversions: ProviderRow;
    catalogue: CatalogueEntry[];
    deliveries: Delivery[];
}) {
    const [tab, setTab] = useState('pixel');
    const [busy, setBusy] = useState<string | null>(null);

    const columns: Column<CatalogueEntry>[] = [
        { key: 'label', label: 'Application event' },
        {
            key: 'value',
            label: 'Catalogued name',
            render: (row) => <code className="font-mono text-[11px] text-muted-foreground">{row.value}</code>,
        },
        {
            key: 'category',
            label: 'Consent',
            render: (row) => <span className="text-xs">{row.category}</span>,
        },
        {
            key: 'meta_event',
            label: 'Meta event',
            render: (row) =>
                row.meta_event ? (
                    <span className="text-xs font-medium">{row.meta_event}</span>
                ) : (
                    <span className="text-xs text-muted-foreground">not sent to Meta</span>
                ),
        },
    ];

    const deliveryColumns: Column<Delivery>[] = [
        { key: 'event', label: 'Event', render: (row) => row.event ?? '—' },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className="text-xs font-medium capitalize">{row.status}</span>
            ),
        },
        { key: 'attempts', label: 'Attempts', align: 'right' },
        { key: 'http_status', label: 'HTTP', align: 'right', render: (row) => row.http_status ?? '—' },
        {
            key: 'created_at',
            label: 'When',
            render: (row) => (row.created_at ? formatDateTime(row.created_at) : '—'),
        },
        {
            key: 'error',
            label: 'Error',
            render: (row) => <span className="text-xs text-muted-foreground">{row.error ?? '—'}</span>,
        },
    ];

    return (
        <PlatformLayout
            title="Tracking pixels"
            description="Meta pixel and Conversions API. Event mapping is generated from the code, so it cannot drift from what the application actually sends."
        >
            <Head title="Tracking pixels" />

            <Alert variant="info" title="Nothing is sent without advertising consent">
                Both the browser pixel and the server-side Conversions API are gated on the advertising category. A
                visitor who has not granted it is never tracked, and an event queued before consent was withdrawn is
                re-checked at send time and skipped.
            </Alert>

            <Tabs
                tabs={[
                    { key: 'pixel', label: 'Meta Pixel' },
                    { key: 'capi', label: 'Conversions API' },
                    { key: 'mapping', label: 'Event mapping' },
                    { key: 'test', label: 'Test events' },
                ]}
                value={tab}
                onChange={setTab}
            />

            {tab === 'pixel' && <IntegrationCard row={meta_pixel} busy={busy} onBusy={setBusy} />}
            {tab === 'capi' && <IntegrationCard row={meta_conversions} busy={busy} onBusy={setBusy} />}

            {tab === 'mapping' && (
                <Card>
                    <CardHeader
                        title="Application action → Meta event"
                        description="Every catalogued event and the Meta event it maps to. The Conversions API sends nothing for an event with no mapping."
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columns={columns}
                            rows={catalogue}
                            rowKey={(row) => row.value}
                            empty={<EmptyState title="No events catalogued" />}
                        />
                    </CardBody>
                </Card>
            )}

            {tab === 'test' && (
                <Card>
                    <CardHeader
                        title="Recent Conversions API deliveries"
                        description="Include a test event code on the Conversions API tab to route events to Events Manager → Test Events, where they are excluded from reporting."
                    />
                    <CardBody className="p-0">
                        <DataTable
                            columns={deliveryColumns}
                            rows={deliveries}
                            rowKey={(row) => row.event_id + row.status}
                            empty={
                                <EmptyState
                                    title="No deliveries yet"
                                    description="Nothing has been dispatched. Sending needs the Conversions API switched on and verified, and a visitor who has granted advertising consent."
                                />
                            }
                        />
                    </CardBody>
                </Card>
            )}
        </PlatformLayout>
    );
}
