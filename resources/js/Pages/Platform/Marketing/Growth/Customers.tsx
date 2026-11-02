import { Alert, Card, CardBody, CardHeader, DataTable, FilterBar, Tabs } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatMoney, formatNumber } from '@/Components/ui/Money';
import PeriodFilter, { EXTENDED_PRESETS, PeriodValue } from '@/Components/ui/PeriodFilter';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Labelled { label: string; count: number }
interface Cohort { cohort: string; signups: number; active: number; retention: number | null }
interface Efficiency {
    currency: string;
    spend: number;
    spend_is_manual: boolean;
    attributed_revenue: number;
    cac: number | null;
    roas: number | null;
    cac_reason: string | null;
    roas_reason: string | null;
}

export default function Customers({
    period,
    acquisition,
    subscriptions,
    retention,
    lifetime,
    efficiency,
}: {
    period: { preset: string; from: string; to: string; label: string; timezone: string };
    acquisition: { new_customers: number; by_country: Labelled[]; by_plan: Labelled[]; by_campaign: Array<{ label: string; leads: number; converted: number }> };
    subscriptions: Record<string, number | Array<{ currency: string; amount: number }>>;
    retention: { churn_rate: number | null; retention_rate: number | null; churned: number; active_at_start: number; reactivated: number; cohorts: Cohort[]; renewal_rate: { due: number; renewed: number; rate: number | null } };
    lifetime: { customers: number; per_currency: Array<{ currency: string; collected: number; ltv: number }>; note: string };
    efficiency: Efficiency[];
}) {
    const [tab, setTab] = useState('acquisition');

    const apply = (next: PeriodValue) =>
        router.get(
            route('platform.marketing.growth.customers'),
            next.preset === 'custom' ? { preset: 'custom', from: next.from, to: next.to } : { preset: next.preset },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const labelColumns: Column<Labelled>[] = [
        { key: 'label', label: 'Group' },
        { key: 'count', label: 'Count', align: 'right', render: (row) => formatNumber(row.count) },
    ];

    const cohortColumns: Column<Cohort>[] = [
        { key: 'cohort', label: 'Cohort' },
        { key: 'signups', label: 'Signups', align: 'right' },
        { key: 'active', label: 'Still active', align: 'right' },
        { key: 'retention', label: 'Retention', align: 'right', render: (row) => (row.retention === null ? '—' : `${row.retention}%`) },
    ];

    return (
        <PlatformLayout title="Acquisition & retention" description="Who signs up, who stays, what they are worth, and what they cost.">
            <Head title="Acquisition & retention" />

            <Alert variant="info" title="Money is always per currency">
                CAC and ROAS are only produced within a single currency, and manual spend is labelled wherever it feeds a
                figure. LTV is observed revenue, not a forecast.
            </Alert>

            <FilterBar>
                <p className="text-xs text-muted-foreground">{period.label} · {period.from} to {period.to}</p>
                <PeriodFilter value={{ preset: period.preset as PeriodValue['preset'], from: period.from, to: period.to }} onChange={apply} presets={EXTENDED_PRESETS} />
            </FilterBar>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                    ['New customers', formatNumber(acquisition.new_customers)],
                    ['Churn rate', retention.churn_rate === null ? '—' : `${retention.churn_rate}%`],
                    ['Retention', retention.retention_rate === null ? '—' : `${retention.retention_rate}%`],
                    ['Renewal', retention.renewal_rate.rate === null ? '—' : `${retention.renewal_rate.rate}%`],
                    ['Reactivated', formatNumber(retention.reactivated)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 font-mono text-xl font-bold text-foreground">{value}</p>
                    </div>
                ))}
            </div>

            <Tabs
                tabs={[
                    { key: 'acquisition', label: 'Acquisition' },
                    { key: 'retention', label: 'Retention & cohorts' },
                    { key: 'value', label: 'Lifetime value' },
                    { key: 'efficiency', label: 'CAC & ROAS' },
                    { key: 'subscriptions', label: 'Subscriptions' },
                ]}
                value={tab}
                onChange={setTab}
            />

            {tab === 'acquisition' && (
                <div className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader title="By country" />
                        <CardBody className="p-0"><DataTable columns={labelColumns} rows={acquisition.by_country} rowKey={(row) => row.label} /></CardBody>
                    </Card>
                    <Card>
                        <CardHeader title="By plan" />
                        <CardBody className="p-0"><DataTable columns={labelColumns} rows={acquisition.by_plan} rowKey={(row) => row.label} /></CardBody>
                    </Card>
                    <Card>
                        <CardHeader title="By campaign" />
                        <CardBody className="p-0">
                            <DataTable
                                columns={[
                                    { key: 'label', label: 'Campaign' },
                                    { key: 'leads', label: 'Leads', align: 'right' },
                                    { key: 'converted', label: 'Converted', align: 'right' },
                                ]}
                                rows={acquisition.by_campaign}
                                rowKey={(row) => row.label}
                            />
                        </CardBody>
                    </Card>
                </div>
            )}

            {tab === 'retention' && (
                <Card>
                    <CardHeader title="Monthly cohorts" description="Share of each signup month still on an active or trialing subscription." />
                    <CardBody className="p-0"><DataTable columns={cohortColumns} rows={retention.cohorts} rowKey={(row) => row.cohort} /></CardBody>
                </Card>
            )}

            {tab === 'value' && (
                <Card>
                    <CardHeader title="Observed lifetime value" description={lifetime.note} />
                    <CardBody className="p-0">
                        <DataTable
                            columns={[
                                { key: 'currency', label: 'Currency' },
                                { key: 'collected', label: 'Collected', align: 'right', render: (row) => formatMoney(row.collected, row.currency) },
                                { key: 'ltv', label: 'LTV per customer', align: 'right', render: (row) => formatMoney(row.ltv, row.currency) },
                            ]}
                            rows={lifetime.per_currency}
                            rowKey={(row) => row.currency}
                            empty={<p className="p-4 text-sm text-muted-foreground">No settled revenue yet.</p>}
                        />
                    </CardBody>
                </Card>
            )}

            {tab === 'efficiency' && (
                <Card>
                    <CardHeader title="CAC and ROAS" description="Per currency. A reason is shown wherever a ratio is undefined." />
                    <CardBody className="p-0">
                        <DataTable
                            columns={[
                                { key: 'currency', label: 'Currency' },
                                { key: 'spend', label: 'Spend', align: 'right', render: (row) => <span>{formatMoney(row.spend, row.currency)}{row.spend_is_manual && <span className="ml-1 text-xs text-muted-foreground">(manual)</span>}</span> },
                                { key: 'cac', label: 'CAC', align: 'right', render: (row) => (row.cac === null ? <span className="text-xs text-muted-foreground">{row.cac_reason ?? '—'}</span> : formatMoney(row.cac, row.currency)) },
                                { key: 'roas', label: 'ROAS', align: 'right', render: (row) => (row.roas === null ? <span className="text-xs text-muted-foreground">{row.roas_reason ?? '—'}</span> : `${row.roas}×`) },
                            ]}
                            rows={efficiency}
                            rowKey={(row) => row.currency}
                            empty={<p className="p-4 text-sm text-muted-foreground">No spend or attributed revenue in this period.</p>}
                        />
                    </CardBody>
                </Card>
            )}

            {tab === 'subscriptions' && (
                <Card>
                    <CardHeader title="Subscription movement" />
                    <CardBody className="grid gap-3 p-4 sm:grid-cols-4">
                        {['active', 'trialing', 'past_due', 'expired', 'cancelled_in_period', 'new_in_period', 'failed_payments'].map((key) => (
                            <div key={key} className="rounded-md border border-border p-3">
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{key.replace(/_/g, ' ')}</p>
                                <p className="mt-1 font-mono text-lg font-semibold text-foreground">{formatNumber(Number(subscriptions[key] ?? 0))}</p>
                            </div>
                        ))}
                        <div className="rounded-md border border-border p-3">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">MRR</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                                {(subscriptions.mrr as Array<{ currency: string; amount: number }> | undefined)?.map((row) => formatMoney(row.amount, row.currency)).join(' · ') || '—'}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            )}
        </PlatformLayout>
    );
}
