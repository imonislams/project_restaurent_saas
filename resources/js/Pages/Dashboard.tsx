import { Badge, Button, Card, CardBody, CardHeader, KpiCard, PageHeader, StatusDot, formatMoney, formatNumber } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronRight, Layers, ShieldCheck, ShoppingCart, Store, UserPlus, Users, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/Components/ui/cn';
import type { ReactNode } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface ChecklistItem {
    key: string;
    label: string;
    done: boolean;
    required: boolean;
    action: { label: string; href: string } | null;
}

interface TenantInfo {
    name: string;
    slug: string;
    status: string;
    on_trial: boolean;
    trial_ends_at: string | null;
    onboarding_completed: boolean;
    currency: string | null;
    timezone: string | null;
    plan: string | null;
    subscription_status: string | null;
}

interface Progress {
    percent: number;
    completed: number;
    total: number;
    steps: { value: string; label: string; complete: boolean; required: boolean }[];
}

interface Point {
    label: string;
    value: number;
}

interface Analytics {
    currency: string;
    kpis: { label: string; value: number; format: string }[];
    trend: Point[];
    top_products: Point[];
    payment_mix: Point[];
    busiest_hours: Point[];
}

interface Business360 {
    branches: number;
    users: number;
    products: number;
    customers: number;
    active_customers: number;
    low_stock: number;
    pending_approvals: number;
}

interface CustomerAnalytics {
    total: number;
    spend: number;
    repeat: number;
    segments: { key: string; label: string; count: number; spend: number }[];
    top: { name: string; segment: string; orders: number; spend: number }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { active: 'success', suspended: 'danger', pending: 'warning', archived: 'neutral' };
const SEGMENT_TONE: Record<string, BadgeTone> = { champions: 'success', loyal: 'info', high_value: 'success', new: 'info', regular: 'neutral', at_risk: 'warning', lost: 'danger' };
const SEGMENT_LABEL: Record<string, string> = { champions: 'Champions', loyal: 'Loyal', high_value: 'High-value', new: 'New', regular: 'Regular', at_risk: 'At risk', lost: 'Lost' };
const CHART_COLORS = ['#0f766e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

function money(currency: string) {
    return (value: number) => formatMoney(value, currency);
}

export default function Dashboard({
    tenant,
    checklist,
    warnings,
    progress,
    stats,
    analytics,
    customerAnalytics,
    business360,
}: {
    tenant: TenantInfo | null;
    checklist: ChecklistItem[];
    warnings: { key: string; label: string }[];
    progress: Progress | null;
    stats: { branches?: number; users?: number };
    analytics?: Analytics | null;
    customerAnalytics?: CustomerAnalytics | null;
    business360?: Business360 | null;
}) {
    const { flash } = usePage().props as Record<string, any>;
    const t = useT();

    if (tenant === null) {
        return (
            <AuthenticatedLayout header={<PageHeader title={t('nav.overview')} />}>
                <Head title="Dashboard" />
                <div className="py-12">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Card>
                            <CardBody className="py-10 text-center">
                                <p className="text-sm text-muted-foreground">This account is not linked to an active restaurant workspace.</p>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    const remaining = checklist.filter((item) => !item.done);
    const format = (item: { value: number; format: string }) => (item.format === 'money' ? money(analytics?.currency ?? 'USD')(item.value) : formatNumber(item.value));

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title={tenant.name}
                    description={`${tenant.timezone ?? 'UTC'} · Default Currency: ${tenant.currency ?? 'USD'}`}
                    actions={
                        <div className="flex items-center gap-2">
                            {tenant.on_trial && <Badge tone="warning">Active Trial</Badge>}
                            <Badge tone={STATUS_TONE[tenant.status] ?? 'neutral'}>{tenant.status}</Badge>
                            {!tenant.onboarding_completed && (
                                <Button size="sm" href={route('onboarding.index')}>
                                    {t('dash.continue_setup')}
                                </Button>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs">
                            <Check className="h-4 w-4 stroke-[2.5] text-emerald-600" />
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {/* KPI row — real analytics when onboarding is complete. */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        {analytics
                            ? analytics.kpis.map((kpi) => (
                                  <KpiCard key={kpi.label} label={kpi.label} value={<span className="font-mono text-xl">{format(kpi)}</span>} />
                              ))
                            : (
                                <>
                                    <KpiCard label={t('dash.branches')} value={stats.branches ?? 0} icon={<Store className="h-4 w-4" />} />
                                    <KpiCard label={t('dash.users')} value={stats.users ?? 0} icon={<Users className="h-4 w-4" />} />
                                    <KpiCard
                                        label={t('dash.plan')}
                                        value={tenant.plan ? <span className="font-mono text-xl">{tenant.plan}</span> : '—'}
                                        hint={tenant.subscription_status ?? 'No subscription'}
                                        icon={<Layers className="h-4 w-4" />}
                                    />
                                    <KpiCard
                                        label={t('dash.status')}
                                        value={<span className="capitalize">{tenant.status}</span>}
                                        tone={tenant.status === 'active' ? 'success' : tenant.status === 'suspended' ? 'danger' : 'warning'}
                                        icon={<ShieldCheck className="h-4 w-4" />}
                                    />
                                </>
                            )}
                    </div>

                    {analytics && business360 ? (
                        <>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                    <CardHeader title="Sales trend" description="Net sales (excluding tax) over the last 14 days" />
                                    <CardBody className="h-64 p-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analytics.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} />
                                                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                                                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" width={48} />
                                                <Tooltip
                                                    formatter={(value: number) => formatMoney(value, analytics.currency)}
                                                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2} fill="url(#salesFill)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardBody>
                                </Card>

                                <Card>
                                    <CardHeader title="Business 360" description="A snapshot across your workspace" />
                                    <CardBody className="p-4">
                                        <dl className="grid grid-cols-2 gap-3">
                                            <Fact label="Branches" value={business360.branches} />
                                            <Fact label="Team" value={business360.users} />
                                            <Fact label="Products" value={business360.products} />
                                            <Fact label="Customers" value={business360.customers} />
                                            <Fact label="Active guests" value={business360.active_customers} />
                                            <Fact label="Low stock" value={business360.low_stock} tone={business360.low_stock > 0 ? 'warn' : undefined} />
                                            <Fact label="Pending orders" value={business360.pending_approvals} tone={business360.pending_approvals > 0 ? 'warn' : undefined} />
                                        </dl>
                                        <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Plan</span>
                                                <span className="font-semibold text-foreground">{tenant.plan ?? '—'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Subscription</span>
                                                <span className="font-semibold capitalize text-foreground">{tenant.subscription_status ?? '—'}</span>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <Card>
                                    <CardHeader title="Top products" description="By revenue" />
                                    <CardBody className="h-56 p-4">
                                        <SimpleBarChart data={analytics.top_products} currency={analytics.currency} />
                                    </CardBody>
                                </Card>
                                <Card>
                                    <CardHeader title="Busiest hours" description="Orders by hour" />
                                    <CardBody className="h-56 p-4">
                                        <SimpleBarChart data={analytics.busiest_hours} currency={analytics.currency} isCount />
                                    </CardBody>
                                </Card>
                                <Card>
                                    <CardHeader title="Payment mix" description="By amount collected" />
                                    <CardBody className="h-56 p-2">
                                        {analytics.payment_mix.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={analytics.payment_mix} dataKey="value" nameKey="label" innerRadius={45} outerRadius={72} paddingAngle={2}>
                                                        {analytics.payment_mix.map((entry, index) => (
                                                            <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value: number) => formatMoney(value, analytics.currency)}
                                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <p className="flex h-full items-center justify-center text-xs text-muted-foreground">No payments yet.</p>
                                        )}
                                    </CardBody>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <Card className="lg:col-span-2">
                                    <CardHeader title="Customer segments" description="Guests grouped by recency, frequency and spend" />
                                    <CardBody className="h-56 p-4">
                                        {customerAnalytics && customerAnalytics.segments.length > 0 ? (
                                            <SimpleBarChart
                                                data={customerAnalytics.segments.map((s) => ({ label: s.label, value: s.count }))}
                                                currency={analytics.currency}
                                                isCount
                                            />
                                        ) : (
                                            <p className="flex h-full items-center justify-center text-xs text-muted-foreground">No customer order history yet.</p>
                                        )}
                                    </CardBody>
                                </Card>
                                <Card>
                                    <CardHeader title="Top customers" description="By lifetime spend" />
                                    <CardBody className="p-2">
                                        {customerAnalytics && customerAnalytics.top.length > 0 ? (
                                            <ul className="divide-y divide-border/60">
                                                {customerAnalytics.top.map((customer) => (
                                                    <li key={customer.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-[13px] font-medium text-foreground">{customer.name}</div>
                                                            <div className="text-[11px] text-muted-foreground">{customer.orders} orders</div>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <Badge tone={SEGMENT_TONE[customer.segment] ?? 'neutral'}>
                                                                {SEGMENT_LABEL[customer.segment] ?? customer.segment}
                                                            </Badge>
                                                            <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                                                                {formatMoney(customer.spend, analytics.currency)}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">No customers yet.</p>
                                        )}
                                    </CardBody>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <Card className="lg:col-span-2">
                                <CardHeader title={t('dash.checklist')} description={progress ? `${progress.completed} of ${progress.total} ${t('dash.complete')}` : undefined} />
                                <CardBody className="p-5">
                                    {progress && (
                                        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                                        </div>
                                    )}

                                    <ul className="divide-y divide-border/60">
                                        {checklist.map((item) => (
                                            <li key={item.key} className="flex items-center justify-between gap-3 py-3 text-xs">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                                            item.done ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        {item.done ? <Check className="h-3 w-3 stroke-[3]" /> : '•'}
                                                    </span>
                                                    <span className={cn('truncate font-medium', item.done ? 'text-muted-foreground line-through' : 'text-foreground')}>
                                                        {item.label}
                                                    </span>
                                                    {item.required && !item.done && <Badge tone="danger">{t('dash.required')}</Badge>}
                                                </div>
                                                {!item.done && item.action && (
                                                    <Link
                                                        href={item.action.href}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <span>{item.action.label}</span>
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </CardBody>
                            </Card>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader title={t('dash.next_steps')} description={t('dash.next_steps_body')} />
                                    <CardBody className="space-y-2 p-4">
                                        <div className="flex flex-col gap-2">
                                            <QuickLink href={route('menu.index')} icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label={t('dash.go_menu')} />
                                            <QuickLink href={route('pos.index')} icon={<ShoppingCart className="h-3.5 w-3.5" />} label={t('dash.open_pos')} />
                                            <QuickLink href={route('staff.index')} icon={<UserPlus className="h-3.5 w-3.5" />} label={t('dash.invite_staff')} />
                                        </div>
                                    </CardBody>
                                </Card>

                                {remaining.length > 0 && !tenant.onboarding_completed && (
                                    <Card className="border-amber-500/20 bg-amber-500/5">
                                        <CardHeader title={t('dash.finish_banner')} />
                                        <CardBody className="space-y-2 p-4 text-xs">
                                            <StatusDot tone="warn" label={`${remaining.filter((i) => i.required).length} required step(s) pending`} />
                                            <p className="text-muted-foreground">{warnings.map((w) => w.label).join(', ') || 'Complete remaining profile steps'}</p>
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Fact({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
    return (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className={cn('mt-0.5 text-lg font-semibold tabular-nums', tone === 'warn' ? 'text-amber-600' : 'text-foreground')}>{formatNumber(value)}</dd>
        </div>
    );
}

function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center justify-between rounded-md border border-border/80 bg-background/50 p-2.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-border hover:bg-accent/60"
        >
            <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    {icon}
                </div>
                <span>{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
}

function SimpleBarChart({ data, currency, isCount = false }: { data: Point[]; currency: string; isCount?: boolean }) {
    if (data.length === 0) {
        return <p className="flex h-full items-center justify-center text-xs text-muted-foreground">No data yet.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="hsl(var(--muted-foreground))" interval={0} angle={-25} textAnchor="end" height={48} />
                <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="hsl(var(--muted-foreground))" width={40} allowDecimals={false} />
                <Tooltip
                    formatter={(value: number) => (isCount ? formatNumber(value) : formatMoney(value, currency))}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
        </ResponsiveContainer>
    );
}
