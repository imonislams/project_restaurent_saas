import { AreaChart, BarChart, LineChart } from '@/Components/charts';
import {
    ActivityBadge,
    Badge,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    StatusDot,
    formatDate,
    formatMoney,
    formatNumber,
} from '@/Components/ui';
import type { BadgeTone, StatusTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link } from '@inertiajs/react';

interface Kpi {
    key: string;
    label: string;
    value: number | null;
    format: 'number' | 'money' | 'percent';
    currency?: string;
    hint?: string;
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
    available?: boolean;
    reason?: string;
}

interface Indicator {
    key: string;
    label: string;
    status: 'ok' | 'warn' | 'error' | 'unavailable';
    detail: string;
    checked_at: string | null;
}

interface Charts {
    revenue_trend: { month: string; collected: number }[];
    subscription_movement: { month: string; new: number; cancelled: number }[];
    tenant_growth: { month: string; new: number; total: number }[];
    revenue_by_plan: { plan: string; collected: number }[];
    subscriptions_by_status: { status: string; count: number }[];
}

const STATUS_TONE: Record<Indicator['status'], StatusTone> = { ok: 'ok', warn: 'warn', error: 'error', unavailable: 'idle' };
const STATUS_LABEL: Record<Indicator['status'], string> = { ok: 'Healthy', warn: 'Attention', error: 'Failed', unavailable: 'Not monitored' };

export default function PlatformDashboard({
    kpis,
    charts,
    health,
    healthSummary,
    recentTenants,
    activity,
    currency,
    methodology,
    period,
}: {
    kpis: Kpi[];
    charts: Charts;
    health: Indicator[];
    healthSummary: { state: string; counts: Record<string, number> };
    recentTenants: { id: number; name: string; status: string; plan: string | null; subscription_status: string | null; created_at: string | null }[];
    activity: { id: number; action: string; actor: string | null; tenant_id: number | null; subject: string | null; created_at: string | null }[];
    currency: string;
    methodology: string[];
    period: { label: string; from: string; to: string };
}) {
    const money = (v: number) => formatMoney(v, currency);
    const count = (v: number) => formatNumber(v);

    const kpiValue = (kpi: Kpi) => {
        if (kpi.available === false) return '—';
        if (kpi.format === 'money') return money(kpi.value ?? 0);
        if (kpi.format === 'percent') return kpi.value === null ? '—' : `${kpi.value}%`;
        return count(kpi.value ?? 0);
    };

    const healthStateTone: BadgeTone = healthSummary.state === 'error' ? 'danger' : healthSummary.state === 'warn' ? 'warning' : 'success';

    return (
        <PlatformLayout title="Overview">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-500">
                    Reporting period: <span className="font-medium text-gray-700">{period.label}</span> · {period.from} → {period.to} · figures in {currency}
                </p>
                <div className="flex items-center gap-2">
                    <Badge tone={healthStateTone}>System {healthSummary.state}</Badge>
                    <span className="text-xs text-gray-400">
                        {healthSummary.counts.ok ?? 0} ok · {healthSummary.counts.warn ?? 0} attention · {healthSummary.counts.unavailable ?? 0} not monitored
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {kpis.map((kpi) => (
                    <KpiCard
                        key={kpi.key}
                        label={kpi.label}
                        value={kpiValue(kpi)}
                        hint={kpi.available === false ? kpi.reason : kpi.hint}
                        tone={kpi.tone ?? 'neutral'}
                    />
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Collected revenue" description={`Paid subscription invoices · ${period.label}`} />
                    <CardBody>
                        {charts.revenue_trend.length ? (
                            <AreaChart data={charts.revenue_trend} xKey="month" series={[{ key: 'collected', name: 'Collected' }]} valueFormat={money} />
                        ) : (
                            <EmptyState title="No revenue recorded" description="Paid subscription invoices will appear here." />
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Subscriptions by status" />
                    <CardBody>
                        {charts.subscriptions_by_status.length ? (
                            <BarChart data={charts.subscriptions_by_status} xKey="status" series={[{ key: 'count', name: 'Subscriptions' }]} valueFormat={count} height={260} />
                        ) : (
                            <EmptyState title="No subscriptions yet" />
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="New vs cancelled" description="Subscriptions per month" />
                    <CardBody>
                        <BarChart
                            data={charts.subscription_movement}
                            xKey="month"
                            series={[
                                { key: 'new', name: 'New', color: '#10b981' },
                                { key: 'cancelled', name: 'Cancelled', color: '#ef4444' },
                            ]}
                            valueFormat={count}
                        />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Tenant growth" description="New and cumulative" />
                    <CardBody>
                        <LineChart
                            data={charts.tenant_growth}
                            xKey="month"
                            series={[
                                { key: 'total', name: 'Total' },
                                { key: 'new', name: 'New' },
                            ]}
                            valueFormat={count}
                        />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Revenue by plan" description={`Collected · ${period.label}`} />
                    <CardBody>
                        {charts.revenue_by_plan.length ? (
                            <BarChart data={charts.revenue_by_plan} xKey="plan" series={[{ key: 'collected', name: 'Collected' }]} valueFormat={money} />
                        ) : (
                            <EmptyState title="No plan revenue in this period" />
                        )}
                    </CardBody>
                </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                    <CardHeader title="System health" description={`${healthSummary.counts.unavailable ?? 0} indicator(s) not monitored yet`} />
                    <CardBody className="space-y-3">
                        {health.map((indicator) => (
                            <div key={indicator.key} className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-800">{indicator.label}</div>
                                    <div className="truncate text-xs text-gray-500">{indicator.detail}</div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {indicator.status === 'unavailable' ? (
                                        <Badge tone="neutral">{STATUS_LABEL.unavailable}</Badge>
                                    ) : (
                                        <StatusDot tone={STATUS_TONE[indicator.status]} label={STATUS_LABEL[indicator.status]} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Recent activity" description="Audited platform events" />
                    <CardBody className="space-y-2.5">
                        {activity.map((event) => (
                            <div key={event.id} className="flex items-start justify-between gap-3 text-sm">
                                <ActivityBadge action={event.action} showIcon />
                                <div className="shrink-0 text-right text-xs text-gray-400">
                                    <div>{event.actor ?? 'System'}</div>
                                    <div>
                                        {event.tenant_id ? `tenant #${event.tenant_id} · ` : ''}
                                        {event.created_at ? formatDate(event.created_at) : ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {activity.length === 0 && <p className="text-sm text-gray-500">No activity recorded yet.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="Recent tenants"
                        action={
                            <Link href={route('platform.tenants.index')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                View all
                            </Link>
                        }
                    />
                    <CardBody className="space-y-2.5">
                        {recentTenants.map((tenant) => (
                            <div key={tenant.id} className="flex items-center justify-between gap-3 text-sm">
                                <Link href={route('platform.tenants.show', tenant.id)} className="truncate font-medium text-indigo-600 hover:text-indigo-700">
                                    {tenant.name}
                                </Link>
                                <span className="shrink-0 text-xs text-gray-500">{tenant.plan ?? '—'}</span>
                            </div>
                        ))}
                        {recentTenants.length === 0 && <p className="text-sm text-gray-500">No tenants yet.</p>}
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader title="How these figures are calculated" description="Metric definitions — read before acting on financial numbers" />
                <CardBody>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600">
                        {methodology.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
