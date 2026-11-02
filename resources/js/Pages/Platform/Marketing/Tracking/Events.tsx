import { Alert, Badge, Card, CardBody, DataTable, EmptyState, FilterBar, Pagination, TextField, SelectField, Button } from '@/Components/ui';
import type { Column, PageLink } from '@/Components/ui';
import { formatDateTime, formatMoney } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface DeliveryState {
    provider: string;
    status: string;
    attempts: number;
    http_status: number | null;
    error: string | null;
    sent_at: string | null;
}

interface EventRow {
    id: number;
    event_id: string;
    name: string;
    label: string;
    category: string;
    source: string;
    occurred_at: string | null;
    path: string | null;
    channel: string | null;
    utm_campaign: string | null;
    campaign: string | null;
    lead: string | null;
    value: number | null;
    currency: string | null;
    deliveries: DeliveryState[];
}

interface Filters {
    name: string;
    source: string;
    status: string;
    search: string;
}

export default function EventManager({
    events,
    filters,
    options,
    counts,
}: {
    events: { data: EventRow[]; links: PageLink[] };
    filters: Filters;
    options: { names: Array<{ value: string; label: string }> };
    counts: { total: number; today: number; with_deliveries: number; failed: number };
}) {
    const [state, setState] = useState<Filters>(filters);

    const apply = (overrides: Partial<Filters> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.marketing.tracking.events'), next as never, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const deliveryBadge = (deliveries: DeliveryState[]) => {
        if (deliveries.length === 0) {
            return <span className="text-xs text-muted-foreground">not dispatched</span>;
        }

        return (
            <span className="flex flex-wrap gap-1">
                {deliveries.map((delivery) => (
                    <Badge
                        key={delivery.provider + delivery.status}
                        tone={
                            delivery.status === 'sent'
                                ? 'success'
                                : delivery.status === 'failed'
                                  ? 'danger'
                                  : 'neutral'
                        }
                    >
                        {delivery.provider}: {delivery.status}
                    </Badge>
                ))}
            </span>
        );
    };

    const columns: Column<EventRow>[] = [
        {
            key: 'label',
            label: 'Event',
            render: (row) => (
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.label}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{row.name}</p>
                </div>
            ),
        },
        {
            key: 'source',
            label: 'Source',
            render: (row) => <span className="text-xs capitalize">{row.source}</span>,
        },
        {
            key: 'occurred_at',
            label: 'When',
            render: (row) => (
                <span className="text-xs">{row.occurred_at ? formatDateTime(row.occurred_at) : '—'}</span>
            ),
        },
        {
            key: 'context',
            label: 'Context',
            render: (row) => (
                <div className="min-w-0 text-xs text-muted-foreground">
                    {row.path && <p className="truncate">{row.path}</p>}
                    {row.channel && <p className="truncate">{row.channel}</p>}
                    {(row.campaign || row.utm_campaign) && <p className="truncate">{row.campaign ?? row.utm_campaign}</p>}
                    {row.lead && <p className="truncate">lead: {row.lead}</p>}
                </div>
            ),
        },
        {
            key: 'value',
            label: 'Value',
            align: 'right',
            render: (row) =>
                row.value === null || row.currency === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                ) : (
                    <span className="font-mono text-xs">{formatMoney(row.value, row.currency)}</span>
                ),
        },
        { key: 'deliveries', label: 'Delivery', render: (row) => deliveryBadge(row.deliveries) },
    ];

    return (
        <PlatformLayout
            title="Event manager"
            description="Every event this platform recorded, and what happened when it was dispatched."
        >
            <Head title="Event manager" />

            <Alert variant="info" title="A zero here is information">
                Events are only stored when their consent category is granted, so a quiet ledger with no tracking
                connected and one with consent withheld look different for a reason — {counts.total} events in total,{' '}
                {counts.today} today.
            </Alert>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    ['Events recorded', counts.total],
                    ['Recorded today', counts.today],
                    ['Provider deliveries', counts.with_deliveries],
                    ['Failed deliveries', counts.failed],
                ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold text-foreground">{value}</p>
                    </div>
                ))}
            </div>

            <FilterBar>
                <div className="flex flex-wrap items-end gap-3">
                    <TextField
                        label="Search"
                        value={state.search}
                        placeholder="Path, campaign or event id"
                        onChange={(value) => setState((previous) => ({ ...previous, search: value }))}
                        onEnter={() => apply()}
                    />
                    <SelectField
                        label="Event"
                        value={state.name}
                        options={[{ value: '', label: 'All events' }, ...options.names]}
                        onChange={(value) => apply({ name: value })}
                    />
                    <SelectField
                        label="Source"
                        value={state.source}
                        options={[
                            { value: '', label: 'Both' },
                            { value: 'client', label: 'Client' },
                            { value: 'server', label: 'Server' },
                        ]}
                        onChange={(value) => apply({ source: value })}
                    />
                    <SelectField
                        label="Delivery"
                        value={state.status}
                        options={[
                            { value: '', label: 'Any' },
                            { value: 'sent', label: 'Sent' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'skipped', label: 'Skipped' },
                            { value: 'undelivered', label: 'Never dispatched' },
                        ]}
                        onChange={(value) => apply({ status: value })}
                    />
                    <Button size="sm" onClick={() => apply()}>
                        Apply filters
                    </Button>
                </div>
            </FilterBar>

            <Card>
                <CardBody className="p-0">
                    <DataTable
                        columns={columns}
                        rows={events.data}
                        rowKey={(row) => row.id}
                        empty={
                            <EmptyState
                                title="No events recorded"
                                description="Once tracking is connected and a visitor grants consent, their visits and conversions appear here."
                            />
                        }
                    />
                </CardBody>
            </Card>

            <Pagination links={events.links} />
        </PlatformLayout>
    );
}
