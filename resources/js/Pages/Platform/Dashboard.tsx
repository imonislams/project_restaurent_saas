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
import {
    Activity,
    ArrowUpRight,
    Building2,
    CheckCircle2,
    DollarSign,
    Layers,
    Server,
    ShieldAlert,
    Store,
    Users,
} from 'lucide-react';

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

    const healthStateTone: BadgeTone =
        healthSummary.state === 'error' ? 'danger' : healthSummary.state === 'warn' ? 'warning' : 'success';

    const kpiIcon = (kpi: Kpi) => {
        const k = kpi.key.toLowerCase();
        if (k.includes('mrr') || k.includes('revenue') || k.includes('collected') || kpi.format === 'money') {
            return <DollarSign className="h-4 w-4" />;
        }
        if (k.includes('tenant') || k.includes('restaurant')) {
            return <Store className="h-4 w-4" />;
        }
        if (k.includes('subscription') || k.includes('plan')) {
            return <Layers className="h-4 w-4" />;
        }
        if (k.includes('user') || k.includes('admin')) {
            return <Users className="h-4 w-4" />;
        }
        if (k.includes('health') || k.includes('server') || k.includes('system')) {
            return <Server className="h-4 w-4" />;
        }
        return <Activity className="h-4 w-4" />;
    };

    return (
        <PlatformLayout
            title="Overview"
            description={`Reporting period: ${period.label} · ${period.from} to ${period.to}`}
            actions={
                <div className="flex items-center gap-2">
                    <Badge tone={healthStateTone}>
                        System {healthSummary.state}
                    </Badge>
                </div>
            }
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {kpis.map((kpi) => (
                    <KpiCard
                        key={kpi.key}
                        label={kpi.label}
                        value={kpiValue(kpi)}
                        hint={kpi.available === false ? kpi.reason : kpi.hint}
                        tone={kpi.tone ?? 'neutral'}
                        icon={kpiIcon(kpi)}
                    />
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Collected Revenue"
                        description={`Paid subscription invoices · ${period.label}`}
                    />
                    <CardBody>
                        {charts.revenue_trend.length ? (
                            <AreaChart
                                data={charts.revenue_trend}
                                xKey="month"
                                series={[{ key: 'collected', name: 'Collected' }]}
                                valueFormat={money}
                            />
                        ) : (
                            <EmptyState
                                title="No revenue recorded"
                                description="Paid subscription invoices will appear here."
                            />
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Subscriptions by Status" description="Current active distribution" />
                    <CardBody>
                        {charts.subscriptions_by_status.length ? (
                            <BarChart
                                data={charts.subscriptions_by_status}
                                xKey="status"
                                series={[{ key: 'count', name: 'Subscriptions' }]}
                                valueFormat={count}
                                height={260}
                            />
                        ) : (
                            <EmptyState title="No subscriptions yet" />
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="New vs Cancelled" description="Subscription velocity per month" />
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
                    <CardHeader title="Tenant Growth" description="New and cumulative tenants" />
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
                    <CardHeader title="Revenue by Plan" description={`Collected by tier · ${period.label}`} />
                    <CardBody>
                        {charts.revenue_by_plan.length ? (
                            <BarChart
                                data={charts.revenue_by_plan}
                                xKey="plan"
                                series={[{ key: 'collected', name: 'Collected' }]}
                                valueFormat={money}
                            />
                        ) : (
                            <EmptyState title="No plan revenue in this period" />
                        )}
                    </CardBody>
                </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                    <CardHeader
                        title="System Health"
                        description={`${healthSummary.counts.unavailable ?? 0} indicator(s) not monitored yet`}
                    />
                    <CardBody className="space-y-3">
                        {health.map((indicator) => (
                            <div key={indicator.key} className="flex items-start justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                    <div className="font-medium text-foreground">{indicator.label}</div>
                                    <div className="truncate text-muted-foreground">{indicator.detail}</div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {indicator.status === 'unavailable' ? (
                                        <Badge tone="neutral" dot={false}>
                                            {STATUS_LABEL.unavailable}
                                        </Badge>
                                    ) : (
                                        <StatusDot tone={STATUS_TONE[indicator.status]} label={STATUS_LABEL[indicator.status]} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Recent Activity" description="Audited platform events" />
                    <CardBody className="space-y-3">
                        {activity.map((event) => (
                            <div key={event.id} className="flex items-start justify-between gap-3 text-xs">
                                <ActivityBadge action={event.action} showIcon />
                                <div className="shrink-0 text-right text-muted-foreground">
                                    <div className="font-medium text-foreground">{event.actor ?? 'System'}</div>
                                    <div>
                                        {event.tenant_id ? `tenant #${event.tenant_id} · ` : ''}
                                        {event.created_at ? formatDate(event.created_at) : ''}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {activity.length === 0 && <p className="text-xs text-muted-foreground">No activity recorded yet.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader
                        title="Recent Tenants"
                        action={
                            <Link
                                href={route('platform.tenants.index')}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-4"
                            >
                                <span>View all</span>
                                <ArrowUpRight className="h-3 w-3" />
                            </Link>
                        }
                    />
                    <CardBody className="space-y-3">
                        {recentTenants.map((tenant) => (
                            <div key={tenant.id} className="flex items-center justify-between gap-3 text-xs">
                                <Link
                                    href={route('platform.tenants.show', tenant.id)}
                                    className="truncate font-medium text-foreground hover:text-primary transition-colors"
                                >
                                    {tenant.name}
                                </Link>
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                    {tenant.plan ?? 'No plan'}
                                </span>
                            </div>
                        ))}
                        {recentTenants.length === 0 && <p className="text-xs text-muted-foreground">No tenants yet.</p>}
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-6 border-dashed">
                <CardHeader
                    title="Calculation Methodology"
                    description="Metric definitions and accounting principles for financial numbers"
                />
                <CardBody>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {methodology.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
