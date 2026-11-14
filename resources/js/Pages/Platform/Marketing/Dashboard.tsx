import KpiBlock, { KpiBlockData } from '@/Components/Growth/KpiBlock';
import { Alert, Card, CardBody, CardHeader, EmptyState, FilterBar } from '@/Components/ui';
import PeriodFilter, { EXTENDED_PRESETS, PeriodValue } from '@/Components/ui/PeriodFilter';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router } from '@inertiajs/react';
import { Info } from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface TrackingState {
    any_connected: boolean;
    connected: string[];
    not_configured: string[];
    drivers_installed: string[];
    visitors_recorded: number;
    events_recorded: number;
}

interface MarketingDashboardProps {
    period: { preset: string; from: string; to: string; label: string; timezone: string };
    presets: string[];
    blocks: KpiBlockData[];
    trend: Array<{ label: string; views: number; registrations: number }>;
    tracking: TrackingState;
    methodology: string[];
}

const VIEW_COLOR = '#0f766e';
const REGISTRATION_COLOR = '#a8a29e';

export default function MarketingDashboard({
    period,
    blocks,
    trend,
    tracking,
    methodology,
}: MarketingDashboardProps) {
    const periodValue: PeriodValue = {
        preset: period.preset as PeriodValue['preset'],
        from: period.from,
        to: period.to,
    };

    const applyPeriod = (next: PeriodValue) => {
        const params =
            next.preset === 'custom'
                ? { preset: 'custom', from: next.from, to: next.to }
                : { preset: next.preset };

        router.get(route('platform.marketing.dashboard'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const hasTrendData = trend.some((point) => point.views > 0 || point.registrations > 0);

    return (
        <PlatformLayout
            title="Marketing Dashboard"
            description={`Acquisition, lead and subscription performance · ${period.label} · times in ${period.timezone}`}
        >
            <Head title="Marketing Dashboard" />

            <Alert
                variant={tracking.any_connected ? 'success' : 'info'}
                icon={<Info className="h-4 w-4" aria-hidden="true" />}
                title={
                    tracking.any_connected
                        ? 'Website tracking is live'
                        : 'Website tracking is not connected'
                }
            >
                {tracking.any_connected ? (
                    <p>Tracking through {tracking.connected.join(', ')}. Visitor figures below are collected.</p>
                ) : (
                    <p>
                        Only the website figures below depend on this. Leads, campaigns, the lead CRM, email and SEO work
                        without it, and their numbers are real. So far {tracking.visitors_recorded} visitor
                        {tracking.visitors_recorded === 1 ? '' : 's'} and {tracking.events_recorded} event
                        {tracking.events_recorded === 1 ? '' : 's'} have been recorded.
                    </p>
                )}
            </Alert>

            <FilterBar>
                <p className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{period.label}</span> · {period.from} to{' '}
                    {period.to}
                </p>
                <PeriodFilter value={periodValue} onChange={applyPeriod} presets={EXTENDED_PRESETS} />
            </FilterBar>

            {blocks.map((block) => (
                <KpiBlock key={block.key} block={block} />
            ))}

            <Card>
                <CardHeader
                    title="Page views and restaurant registrations"
                    description="Both series come from this platform's own records, bucketed in the platform timezone."
                    action={
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ background: VIEW_COLOR }} />
                                Page views
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-0.5 w-3 rounded-full" style={{ background: REGISTRATION_COLOR }} />
                                Registrations
                            </span>
                        </div>
                    }
                />
                <CardBody className="h-72 p-4">
                    {hasTrendData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="marketingViewsFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={VIEW_COLOR} stopOpacity={0.28} />
                                        <stop offset="100%" stopColor={VIEW_COLOR} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={11}
                                    stroke="hsl(var(--muted-foreground))"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={11}
                                    stroke="hsl(var(--muted-foreground))"
                                    width={44}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: '1px solid hsl(var(--border))',
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    name="Page views"
                                    stroke={VIEW_COLOR}
                                    strokeWidth={2}
                                    fill="url(#marketingViewsFill)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="registrations"
                                    name="Registrations"
                                    stroke={REGISTRATION_COLOR}
                                    strokeWidth={1.5}
                                    strokeDasharray="4 4"
                                    fill="transparent"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState
                            title="No traffic recorded"
                            description="Once website tracking is connected and verified, page views and registrations appear here. Nothing is charted until there is real data."
                        />
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardHeader
                    title="What these numbers mean"
                    description="Every figure above is defined here, so no metric is left open to interpretation."
                />
                <CardBody className="p-4">
                    <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                        {methodology.map((line) => (
                            <li key={line} className="flex gap-2">
                                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
