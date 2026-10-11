import { Badge, Button, Card, DataTable, Drawer, FilterBar, Pagination, SelectField, TextField, formatMoney } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

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
                    <Link href={route('platform.tenants.show', r.tenant_id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                        {r.tenant}
                    </Link>
                ) : (
                    '—'
                ),
        },
        { key: 'plan', label: 'Plan', render: (r) => r.plan ?? '—' },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status_label}</Badge> },
        { key: 'billing_cycle', label: 'Cycle' },
        { key: 'mrr', label: 'MRR', align: 'right', render: (r) => formatMoney(r.mrr, r.currency) },
        { key: 'coupon_code', label: 'Coupon', render: (r) => r.coupon_code ?? '—' },
        {
            key: 'period',
            label: 'Renews / ends',
            render: (r) => (r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : '—'),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
                <div className="flex justify-end gap-2 text-xs">
                    {r.status === 'past_due' || r.status === 'grace_period' ? (
                        <button onClick={() => post('platform.subscriptions.retry', r)} className="font-medium text-indigo-600 hover:text-indigo-700">
                            Retry
                        </button>
                    ) : (
                        <button onClick={() => post('platform.subscriptions.renew', r)} className="font-medium text-gray-600 hover:text-gray-800">
                            Renew
                        </button>
                    )}
                    <button onClick={() => toggle(r)} className="font-medium text-amber-600 hover:text-amber-700">
                        {r.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                    </button>
                    <button onClick={() => setCouponFor(r)} className="font-medium text-gray-600 hover:text-gray-800">
                        Coupon
                    </button>
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
        <PlatformLayout title="Subscriptions" description="Every tenant subscription with lifecycle actions. Use the tabs to focus on trials, failed renewals or cancellations.">
            <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
                {tabs.map((tab) => (
                    <Link
                        key={tab.route}
                        href={route(tab.route)}
                        className={
                            '-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition ' +
                            (route().current(tab.pattern) ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700')
                        }
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            <FilterBar>
                <TextField label="Search" value={state.search} placeholder="Tenant name" onChange={(v) => setState((s) => ({ ...s, search: v }))} onEnter={() => apply()} />
                <SelectField label="Status" value={state.status} options={[{ value: '', label: 'Any status' }, ...options.statuses]} onChange={(v) => apply({ status: v })} />
                <SelectField label="Plan" value={state.plan} options={[{ value: '', label: 'Any plan' }, ...options.plans]} onChange={(v) => apply({ plan: v })} />
                <Button size="sm" onClick={() => apply()}>
                    Apply
                </Button>
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={subscriptions.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={subscriptions.links} />

            <Drawer show={couponFor !== null} onClose={() => setCouponFor(null)} title={`Apply coupon${couponFor ? ` — ${couponFor.tenant ?? ''}` : ''}`} footer={<Button size="sm" onClick={applyCoupon}>Apply coupon</Button>}>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500">Coupon code</span>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="block w-full rounded-md border-gray-300 text-sm" />
                </label>
                {couponFor?.coupon_code && (
                    <button onClick={() => router.delete(route('platform.subscriptions.coupon.remove', couponFor.id), { preserveScroll: true, onSuccess: () => setCouponFor(null) })} className="mt-3 text-xs font-medium text-red-600 hover:text-red-700">
                        Remove current coupon ({couponFor.coupon_code})
                    </button>
                )}
            </Drawer>
        </PlatformLayout>
    );
}
