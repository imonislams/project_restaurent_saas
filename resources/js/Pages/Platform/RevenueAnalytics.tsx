import { AreaChart, BarChart, LineChart } from '@/Components/charts';
import { Card, CardBody, CardHeader, DateRangePicker, EmptyState, FilterBar, KpiCard, formatMoney, formatNumber } from '@/Components/ui';
import type { DateRange } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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

interface Charts {
    revenue_trend: { month: string; collected: number }[];
    subscription_movement: { month: string; new: number; cancelled: number }[];
    tenant_growth: { month: string; new: number; total: number }[];
    revenue_by_plan: { plan: string; collected: number }[];
    subscriptions_by_status: { status: string; count: number }[];
}

export default function RevenueAnalytics({
    kpis,
    charts,
    currency,
    methodology,
    period,
}: {
    kpis: Kpi[];
    charts: Charts;
    currency: string;
    methodology: string[];
    period: { label: string; from: string; to: string; preset: string | null };
}) {
    const [range, setRange] = useState<DateRange>({ from: period.from, to: period.to, preset: period.preset ?? undefined });

    const apply = (next: DateRange) => {
        setRange(next);
        const params = next.preset ? { preset: next.preset } : { from: next.from, to: next.to };
        router.get(route('platform.analytics.index'), params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const money = (v: number) => formatMoney(v, currency);
    const count = (v: number) => formatNumber(v);

    const kpiValue = (kpi: Kpi) => {
        if (kpi.available === false) return '—';
        if (kpi.format === 'money') return money(kpi.value ?? 0);
        if (kpi.format === 'percent') return kpi.value === null ? '—' : `${kpi.value}%`;
        return count(kpi.value ?? 0);
    };

    return (
        <PlatformLayout title="Revenue Analytics">
            <FilterBar>
                <DateRangePicker value={range} onChange={apply} />
            </FilterBar>

            <p className="mb-4 text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{period.label}</span> · {period.from} → {period.to} · figures in {currency}
            </p>

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
                    <CardHeader title="Collected revenue" description="Paid subscription invoices" />
                    <CardBody>
                        {charts.revenue_trend.length ? (
                            <AreaChart data={charts.revenue_trend} xKey="month" series={[{ key: 'collected', name: 'Collected' }]} valueFormat={money} />
                        ) : (
                            <EmptyState title="No revenue recorded" />
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
                    <CardHeader title="Revenue by plan" description="Collected revenue" />
                    <CardBody>
                        {charts.revenue_by_plan.length ? (
                            <BarChart data={charts.revenue_by_plan} xKey="plan" series={[{ key: 'collected', name: 'Collected' }]} valueFormat={money} />
                        ) : (
                            <EmptyState title="No plan revenue in this period" />
                        )}
                    </CardBody>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader title="How these figures are calculated" description="Metric definitions" />
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
