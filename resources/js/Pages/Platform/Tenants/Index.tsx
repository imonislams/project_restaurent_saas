import { Badge, Button, Card, ConfirmDialog, DataTable, FilterBar, Pagination, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink, SortState } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface TenantRow {
    id: number;
    name: string;
    slug: string;
    business_email: string;
    status: string;
    status_label: string;
    verified: boolean;
    plan: string | null;
    subscription_status: string | null;
    branches_count: number;
    users_count: number;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

interface Filters {
    search: string;
    status: string;
    subscription_status: string;
    plan: string;
    verification: string;
    from: string;
    to: string;
    sort: string;
    direction: 'asc' | 'desc';
}

interface Option {
    value: string;
    label: string;
}

const STATUS_TONE: Record<string, BadgeTone> = { active: 'success', suspended: 'danger', pending: 'warning', archived: 'neutral' };

const SUB_STATUS_TONE: Record<string, BadgeTone> = {
    active: 'success',
    trialing: 'info',
    past_due: 'warning',
    grace: 'warning',
    unpaid: 'warning',
    suspended: 'danger',
    cancelled: 'neutral',
    expired: 'neutral',
};

const STATUS_OPTIONS: Option[] = [
    { value: '', label: 'All accounts' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'archived', label: 'Archived' },
];

const VERIFICATION_OPTIONS: Option[] = [
    { value: '', label: 'Any verification' },
    { value: 'verified', label: 'Verified' },
    { value: 'pending', label: 'Unverified' },
];

const BULK_LABEL: Record<string, string> = {
    verify: 'Verify',
    activate: 'Activate',
    archive: 'Archive',
    suspend: 'Suspend',
};

export default function TenantsIndex({
    tenants,
    filters,
    options,
}: {
    tenants: Paginated<TenantRow>;
    filters: Filters;
    options: { statuses: Option[]; subscription_statuses: Option[]; plans: Option[] };
}) {
    const [state, setState] = useState<Filters>(filters);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState('verify');
    const [bulkReason, setBulkReason] = useState('');
    const [confirmBulk, setConfirmBulk] = useState(false);
    const [processing, setProcessing] = useState(false);

    const apply = (overrides: Partial<Filters> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.tenants.index'), next as any, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const sort: SortState = { key: filters.sort, direction: filters.direction };
    const onSort = (key: string) => {
        apply({ sort: key, direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc' });
    };

    const toggle = (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const toggleAll = () => setSelected((prev) => (prev.length === tenants.data.length ? [] : tenants.data.map((t) => t.id)));
    const runBulk = () => {
        setProcessing(true);
        router.post(
            route('platform.tenants.bulk'),
            { action: bulkAction, ids: selected, reason: bulkReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelected([]);
                    setBulkReason('');
                },
                onFinish: () => {
                    setProcessing(false);
                    setConfirmBulk(false);
                },
            },
        );
    };

    const columns: Column<TenantRow>[] = [
        {
            key: 'name',
            label: 'Tenant',
            sortable: true,
            render: (t) => (
                <div>
                    <Link href={route('platform.tenants.show', t.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                        {t.name}
                    </Link>
                    <div className="text-xs text-gray-400">{t.business_email}</div>
                </div>
            ),
        },
        { key: 'status', label: 'Account', sortable: true, render: (t) => <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status_label}</Badge> },
        { key: 'verified', label: 'Verification', render: (t) => <Badge tone={t.verified ? 'success' : 'warning'}>{t.verified ? 'Verified' : 'Unverified'}</Badge> },
        { key: 'plan', label: 'Plan', render: (t) => t.plan ?? '—' },
        {
            key: 'subscription_status',
            label: 'Subscription',
            render: (t) => (t.subscription_status ? <Badge tone={SUB_STATUS_TONE[t.subscription_status] ?? 'neutral'}>{t.subscription_status.replace(/_/g, ' ')}</Badge> : '—'),
        },
        { key: 'branches_count', label: 'Branches', align: 'right', sortable: true },
        { key: 'users_count', label: 'Users', align: 'right', sortable: true },
        { key: 'created_at', label: 'Created', sortable: true, render: (t) => (t.created_at ? new Date(t.created_at).toLocaleDateString() : '—') },
    ];

    return (
        <PlatformLayout title="Tenants" description="Every restaurant account on the platform with its account, verification and subscription state.">
            <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
                <Link
                    href={route('platform.tenants.index')}
                    className={
                        '-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition ' +
                        (route().current('platform.tenants.index') ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700')
                    }
                >
                    All tenants
                </Link>
                <Link
                    href={route('platform.tenants.verification')}
                    className={
                        '-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition ' +
                        (route().current('platform.tenants.verification') ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700')
                    }
                >
                    Awaiting verification
                </Link>
            </div>

            <FilterBar
                actions={
                    <Button variant="secondary" size="sm" href={route('platform.tenants.export', state as unknown as Record<string, unknown>)}>
                        Export CSV
                    </Button>
                }
            >
                <TextField
                    label="Search"
                    value={state.search}
                    placeholder="Name, email or slug"
                    onChange={(v) => setState((s) => ({ ...s, search: v }))}
                    onEnter={() => apply()}
                />
                <SelectField label="Account" value={state.status} options={STATUS_OPTIONS} onChange={(v) => apply({ status: v })} />
                <SelectField label="Verification" value={state.verification} options={VERIFICATION_OPTIONS} onChange={(v) => apply({ verification: v })} />
                <SelectField
                    label="Subscription"
                    value={state.subscription_status}
                    options={[{ value: '', label: 'Any status' }, ...options.subscription_statuses]}
                    onChange={(v) => apply({ subscription_status: v })}
                />
                <SelectField
                    label="Plan"
                    value={state.plan}
                    options={[{ value: '', label: 'Any plan' }, ...options.plans]}
                    onChange={(v) => apply({ plan: v })}
                />
                <Button size="sm" onClick={() => apply()}>
                    Apply
                </Button>
            </FilterBar>

            {selected.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm">
                    <span className="font-medium text-indigo-800">{selected.length} selected</span>
                    <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="rounded-md border-gray-300 text-sm">
                        <option value="verify">Verify</option>
                        <option value="activate">Activate</option>
                        <option value="archive">Archive</option>
                        <option value="suspend">Suspend</option>
                    </select>
                    {bulkAction === 'suspend' && (
                        <input
                            value={bulkReason}
                            onChange={(e) => setBulkReason(e.target.value)}
                            placeholder="Reason (required)"
                            className="rounded-md border-gray-300 text-sm"
                        />
                    )}
                    <Button size="sm" variant={bulkAction === 'suspend' ? 'danger' : 'primary'} loading={processing} onClick={() => setConfirmBulk(true)}>
                        Apply to selected
                    </Button>
                    <button onClick={() => setSelected([])} className="text-xs text-indigo-700 hover:underline">
                        Clear
                    </button>
                </div>
            )}

            <Card>
                <DataTable
                    columns={columns}
                    rows={tenants.data}
                    rowKey={(t) => t.id}
                    sort={sort}
                    onSort={onSort}
                    selectable
                    selected={selected}
                    onToggle={(id) => toggle(Number(id))}
                    onToggleAll={toggleAll}
                />
            </Card>

            <Pagination links={tenants.links} />

            <ConfirmDialog
                show={confirmBulk}
                title={`${BULK_LABEL[bulkAction] ?? 'Apply'} ${selected.length} tenant(s)?`}
                description={
                    bulkAction === 'suspend'
                        ? 'Suspended tenants lose access immediately. This does not delete any data.'
                        : 'This change is applied to every selected tenant and is recorded in the audit log.'
                }
                confirmLabel={BULK_LABEL[bulkAction] ?? 'Apply'}
                tone={bulkAction === 'suspend' || bulkAction === 'archive' ? 'danger' : 'primary'}
                processing={processing}
                onConfirm={runBulk}
                onClose={() => setConfirmBulk(false)}
            />
        </PlatformLayout>
    );
}
