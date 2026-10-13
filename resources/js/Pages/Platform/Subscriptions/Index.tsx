import { Badge, Button, Card, DataTable, Drawer, FilterBar, Pagination, SelectField, TextField, Input, formatMoney } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { RotateCw, ShieldAlert, Tag } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

interface Row {
    id: number;
    tenant: string | null;
    tenant_id: number;
    plan: string | null;
    status: string;
    status_label: string;
    billing_cycle: string;
    currency: string;
    mrr: number;
    coupon_code: string | null;
    trial_ends_at: string | null;
    current_period_end: string | null;
    grace_ends_at: string | null;
    cancel_at_period_end: boolean;
    days_remaining: number | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

interface Option {
    value: string;
    label: string;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    active: 'success',
    trialing: 'info',
    past_due: 'warning',
    grace_period: 'warning',
    suspended: 'danger',
    cancelled: 'neutral',
    expired: 'neutral',
};

export default function SubscriptionsIndex({
    subscriptions,
    filters,
    options,
}: {
    subscriptions: Paginated<Row>;
    filters: { search: string; status: string; plan: string };
    options: { statuses: Option[]; plans: Option[] };
}) {
    const [state, setState] = useState(filters);
    const [couponFor, setCouponFor] = useState<Row | null>(null);
    const [code, setCode] = useState('');

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.subscriptions.index'), next as any, { preserveState: true, preserveScroll: true, replace: true });
    };

    const post = (name: string, row: Row, data: Record<string, unknown> = {}) =>
        router.post(route(name, row.id), data as any, { preserveScroll: true });

    const toggle = (row: Row) => {
        if (row.status === 'suspended' || row.status === 'expired' || row.status === 'cancelled') {
            post('platform.subscriptions.reactivate', row);
        } else {
            post('platform.subscriptions.suspend', row);
        }
    };

    const columns: Column<Row>[] = [
        {
            key: 'tenant',
            label: 'Tenant',
            render: (r) =>
                r.tenant ? (
                    <Link
                        href={route('platform.tenants.show', r.tenant_id)}
                        className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4 transition-colors"
                    >
                        {r.tenant}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'plan',
            label: 'Plan',
            render: (r) => (r.plan ? <span className="font-mono text-xs">{r.plan}</span> : '—'),
        },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status_label}</Badge> },
        { key: 'billing_cycle', label: 'Cycle', render: (r) => <span className="capitalize text-xs text-muted-foreground">{r.billing_cycle}</span> },
        { key: 'mrr', label: 'MRR', align: 'right', render: (r) => <span className="font-semibold tabular-nums">{formatMoney(r.mrr, r.currency)}</span> },
        { key: 'coupon_code', label: 'Coupon', render: (r) => r.coupon_code ? <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{r.coupon_code}</span> : '—' },
        {
            key: 'period',
            label: 'Renews / Ends',
            render: (r) => (
                <span className="text-xs text-muted-foreground">
                    {r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
                <div className="flex justify-end gap-1.5 text-xs">
                    {r.status === 'past_due' || r.status === 'grace_period' ? (
                        <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => post('platform.subscriptions.retry', r)}
                        >
                            Retry
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={() => post('platform.subscriptions.renew', r)}
                        >
                            Renew
                        </Button>
                    )}
                    <Button
                        variant={r.status === 'suspended' ? 'outline' : 'ghost'}
                        size="xs"
                        className={r.status === 'suspended' ? 'text-primary' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'}
                        onClick={() => toggle(r)}
                    >
                        {r.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setCouponFor(r)}
                        icon={<Tag className="h-3 w-3" />}
                    >
                        Coupon
                    </Button>
                </div>
            ),
        },
    ];

    const applyCoupon = () => {
        if (!couponFor) return;
        router.post(
            route('platform.subscriptions.coupon.apply', couponFor.id),
            { code },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCouponFor(null);
                    setCode('');
                },
            },
        );
    };

    const tabs = [
        { label: 'All subscriptions', route: 'platform.subscriptions.index', pattern: 'platform.subscriptions.index' },
        { label: 'Trials & expiring', route: 'platform.subscriptions.trials', pattern: 'platform.subscriptions.trials' },
        { label: 'Failed renewals', route: 'platform.subscriptions.past-due', pattern: 'platform.subscriptions.past-due' },
        { label: 'Cancellations', route: 'platform.subscriptions.cancellations', pattern: 'platform.subscriptions.cancellations' },
    ];

    return (
        <PlatformLayout
            title="Subscriptions"
            description="Manage lifecycle events, billing cycles, renewals, coupons, and MRR across tenant plans."
        >
            <div className="mb-5 flex flex-wrap gap-1 border-b border-border/80">
                {tabs.map((tab) => {
                    const active = route().current(tab.pattern);
                    return (
                        <Link
                            key={tab.route}
                            href={route(tab.route)}
                            className={cn(
                                '-mb-px border-b-2 px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors',
                                active
                                    ? 'border-primary text-primary font-semibold'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            <FilterBar>
                <TextField
                    label="Search"
                    value={state.search}
                    placeholder="Tenant name"
                    onChange={(v) => setState((s) => ({ ...s, search: v }))}
                    onEnter={() => apply()}
                />
                <SelectField
                    label="Status"
                    value={state.status}
                    options={[{ value: '', label: 'Any status' }, ...options.statuses]}
                    onChange={(v) => apply({ status: v })}
                />
                <SelectField
                    label="Plan"
                    value={state.plan}
                    options={[{ value: '', label: 'Any plan' }, ...options.plans]}
                    onChange={(v) => apply({ plan: v })}
                />
                <Button size="sm" onClick={() => apply()}>
                    Apply Filters
                </Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={subscriptions.data} rowKey={(r) => r.id} />
            </Card>

            <Pagination links={subscriptions.links} />

            <Drawer
                show={couponFor !== null}
                onClose={() => setCouponFor(null)}
                title={`Apply coupon${couponFor ? ` — ${couponFor.tenant ?? ''}` : ''}`}
                footer={
                    <Button size="sm" onClick={applyCoupon}>
                        Apply coupon
                    </Button>
                }
            >
                <div className="space-y-3">
                    <label className="block space-y-1.5">
                        <span className="block text-xs font-semibold text-foreground tracking-tight">Coupon code</span>
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. PROMO2026"
                            className="font-mono uppercase"
                        />
                    </label>
                    {couponFor?.coupon_code && (
                        <button
                            onClick={() =>
                                router.delete(route('platform.subscriptions.coupon.remove', couponFor.id), {
                                    preserveScroll: true,
                                    onSuccess: () => setCouponFor(null),
                                })
                            }
                            className="mt-2 text-xs font-medium text-destructive hover:underline cursor-pointer"
                        >
                            Remove current coupon ({couponFor.coupon_code})
                        </button>
                    )}
                </div>
            </Drawer>
        </PlatformLayout>
    );
}
