import { Alert, Card, CardBody, CardHeader, DataTable, FilterBar, Tabs } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatMoney, formatNumber } from '@/Components/ui/Money';
import PeriodFilter, { EXTENDED_PRESETS, PeriodValue } from '@/Components/ui/PeriodFilter';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface ChannelRow {
    channel: string;
    label: string;
    customers: number;
    value: Array<{ currency: string; amount: number }>;
}

interface ModelBlock {
    customers: number;
    channels: ChannelRow[];
    unattributed: number;
}

export default function Attribution({
    period,
    attribution,
    window_days,
    headline_model,
}: {
    period: { preset: string; from: string; to: string; label: string; timezone: string };
    attribution: {
        models: Record<string, ModelBlock>;
        window_days: number;
        headline_model: string;
        total_revenue: Array<{ currency: string; amount: number }>;
    };
    window_days: number;
    headline_model: string;
}) {
    const [model, setModel] = useState(headline_model);
    const block = attribution.models[model] ?? { customers: 0, channels: [], unattributed: 0 };

    const apply = (next: PeriodValue) =>
        router.get(
            route('platform.marketing.growth.attribution'),
            next.preset === 'custom' ? { preset: 'custom', from: next.from, to: next.to } : { preset: next.preset },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const columns: Column<ChannelRow>[] = [
        { key: 'label', label: 'Channel', render: (row) => <span className="text-sm font-medium text-foreground">{row.label}</span> },
        { key: 'customers', label: 'Customers', align: 'right', render: (row) => formatNumber(row.customers) },
        {
            key: 'value',
            label: 'Attributed revenue',
            align: 'right',
            render: (row) =>
                row.value.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                ) : (
                    <span className="font-mono text-xs">
                        {row.value.map((entry) => `${formatMoney(entry.amount, entry.currency)}`).join(' · ')}
                    </span>
                ),
        },
    ];

    return (
        <PlatformLayout
            title="Revenue attribution"
            description="Which channel earned the customer, by first touch and by last touch."
        >
            <Head title="Revenue attribution" />

            <Alert variant="info" title={`${window_days}-day attribution window`}>
                A touchpoint older than the window does not qualify, and the customer is reported as direct rather than
                dropped. Attributed revenue is shown separately from total revenue — the two are never added together.
            </Alert>

            <FilterBar>
                <p className="text-xs text-muted-foreground">
                    {period.label} · {period.from} to {period.to}
                </p>
                <PeriodFilter
                    value={{ preset: period.preset as PeriodValue['preset'], from: period.from, to: period.to }}
                    onChange={apply}
                    presets={EXTENDED_PRESETS}
                />
            </FilterBar>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Attributed customers</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-foreground">{formatNumber(block.customers)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{block.unattributed} with no qualifying touchpoint (direct)</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total settled revenue</p>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground">
                        {attribution.total_revenue.length === 0
                            ? '—'
                            : attribution.total_revenue.map((entry) => formatMoney(entry.amount, entry.currency)).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">All revenue, per currency — not attributed to marketing.</p>
                </div>
            </div>

            <Tabs
                tabs={[
                    { key: 'first_touch', label: 'First touch' },
                    { key: 'last_touch', label: 'Last touch' },
                ]}
                value={model}
                onChange={setModel}
            />

            <Card>
                <CardHeader
                    title={model === 'first_touch' ? 'Credit the first visit' : 'Credit the visit before converting'}
                    description="Customers per channel, with revenue attributed at the model's own value."
                />
                <CardBody className="p-0">
                    <DataTable
                        columns={columns}
                        rows={block.channels}
                        rowKey={(row) => row.channel}
                        empty={<DataTable columns={columns} rows={[]} rowKey={() => ''} empty={<span className="p-4 text-sm text-muted-foreground">No attributions recorded yet. They are written when a restaurant registers.</span>} />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
