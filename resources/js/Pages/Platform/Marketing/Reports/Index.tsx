import { Alert, Badge, Button, Card, CardBody, CardHeader, DataTable, EmptyState, FilterBar, Tabs } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime, formatNumber } from '@/Components/ui/Money';
import PeriodFilter, { EXTENDED_PRESETS, PeriodValue } from '@/Components/ui/PeriodFilter';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface ColumnDef {
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
}

interface Report {
    key: string;
    title: string;
    definition: string;
    source: string;
    limitation: string;
    columns: ColumnDef[];
    rows: Array<Record<string, unknown>>;
}

export default function ReportsIndex({
    period,
    reports,
    insights,
    rules,
    metrics,
}: {
    period: { preset: string; from: string; to: string; label: string; timezone: string };
    reports: Report[];
    insights: Array<{ id: number; severity: string; title: string; body: string | null; generated_at: string | null; acknowledged_at: string | null }>;
    rules: Array<{ id: number; name: string; metric: string; operator: string; threshold: number; cooldown_minutes: number; is_enabled: boolean; last_triggered_at: string | null }>;
    metrics: Array<{ label: string; unit: string; value: number | string | null; reason: string | null }>;
}) {
    const [tab, setTab] = useState(reports[0]?.key ?? 'traffic');
    const active = reports.find((report) => report.key === tab) ?? reports[0];

    const apply = (next: PeriodValue) =>
        router.get(
            route('platform.marketing.reports.index'),
            next.preset === 'custom' ? { preset: 'custom', from: next.from, to: next.to } : { preset: next.preset },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const columns: Column<Record<string, unknown>>[] = (active?.columns ?? []).map((column) => ({
        key: column.key,
        label: column.label,
        align: column.align,
        render: (row) => <span className="text-sm">{String(row[column.key] ?? '—')}</span>,
    }));

    return (
        <PlatformLayout
            title="Marketing reports"
            description="Every report states its definition, its source and what it cannot tell you."
            actions={
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => router.post(route('platform.marketing.reports.evaluate'), {}, { preserveScroll: true })}>
                        Evaluate alerts now
                    </Button>
                    {active && (
                        <Button size="sm" variant="secondary" external href={route('platform.marketing.reports.export', { report: active.key, ...period })}>
                            Export CSV
                        </Button>
                    )}
                </div>
            }
        >
            <Head title="Marketing reports" />

            <Alert variant="info" title="How to read these">
                Each report is derived from records this platform holds, under the definition shown beneath the table. If a
                source is missing the report says so instead of showing a zero.
            </Alert>

            <FilterBar>
                <p className="text-xs text-muted-foreground">{period.label} · {period.from} to {period.to} · {period.timezone}</p>
                <PeriodFilter value={{ preset: period.preset as PeriodValue['preset'], from: period.from, to: period.to }} onChange={apply} presets={EXTENDED_PRESETS} />
            </FilterBar>

            <Tabs tabs={reports.map((report) => ({ key: report.key, label: report.title }))} value={tab} onChange={setTab} />

            {active && (
                <Card>
                    <CardHeader title={active.title} description={active.definition} />
                    <CardBody className="space-y-3 p-0">
                        <DataTable columns={columns} rows={active.rows} rowKey={(row) => String(row[active.columns[0]?.key ?? 'row'] ?? JSON.stringify(row))} empty={<EmptyState title="No rows in this period" description="The source produced nothing for these dates — that is a real zero, not a missing report." />} />
                        <div className="space-y-1 border-t border-border px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Source:</span> <code className="font-mono">{active.source}</code>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Limitation:</span> {active.limitation}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader title="Insights" description="Raised by the alert rules. Acknowledging one records who looked at it." />
                <CardBody className="p-4">
                    {insights.length === 0 ? (
                        <EmptyState title="No insights yet" description="Rules are evaluated hourly. Nothing has breached a threshold." />
                    ) : (
                        <ul className="divide-y divide-border">
                            {insights.map((insight) => (
                                <li key={insight.id} className="flex flex-wrap items-start justify-between gap-3 py-2">
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            {insight.title}
                                            <Badge tone={insight.severity === 'critical' ? 'danger' : insight.severity === 'warning' ? 'warning' : 'neutral'}>
                                                {insight.severity}
                                            </Badge>
                                            {insight.acknowledged_at && <span className="text-xs font-normal text-muted-foreground">acknowledged</span>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{insight.body}</p>
                                        {insight.generated_at && <p className="text-[11px] text-muted-foreground">{formatDateTime(insight.generated_at)}</p>}
                                    </div>
                                    {!insight.acknowledged_at && (
                                        <Button
                                            size="xs"
                                            variant="secondary"
                                            onClick={() => router.post(route('platform.marketing.reports.acknowledge', insight.id), {}, { preserveScroll: true })}
                                        >
                                            Acknowledge
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Current metric values" description="What the rules are looking at right now." />
                <CardBody className="p-4">
                    <dl className="grid gap-3 sm:grid-cols-4">
                        {metrics.map((metric) => (
                            <div key={metric.label} className="rounded-md border border-border p-3">
                                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{metric.label}</dt>
                                <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
                                    {metric.value === null ? '—' : metric.unit === 'percent' ? `${metric.value}%` : formatNumber(Number(metric.value))}
                                </dd>
                                {metric.reason && <p className="mt-1 text-[11px] text-muted-foreground">{metric.reason}</p>}
                            </div>
                        ))}
                    </dl>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Alert rules" description="Cooldown prevents the same breach alerting on every run." />
                <CardBody className="p-0">
                    <DataTable
                        columns={[
                            { key: 'name', label: 'Rule' },
                            { key: 'metric', label: 'Metric', render: (row) => <code className="font-mono text-[11px]">{row.metric}</code> },
                            { key: 'operator', label: 'Condition', render: (row) => `${row.operator} ${row.threshold}` },
                            { key: 'cooldown_minutes', label: 'Cooldown', align: 'right', render: (row) => `${row.cooldown_minutes} min` },
                            { key: 'last_triggered_at', label: 'Last fired', render: (row) => (row.last_triggered_at ? formatDateTime(row.last_triggered_at) : 'never') },
                        ]}
                        rows={rules}
                        rowKey={(row) => row.id}
                        empty={<EmptyState title="No rules" />}
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
