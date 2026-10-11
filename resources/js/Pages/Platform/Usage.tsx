import { Badge, Card, DataTable, Pagination } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link } from '@inertiajs/react';

interface Row {
    id: number;
    name: string;
    status: string;
    plan: string | null;
    metrics: Record<string, number>;
    limits: Record<string, number | null>;
    over_limit: boolean;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const STATUS_TONE: Record<string, BadgeTone> = { active: 'success', suspended: 'danger', pending: 'warning', archived: 'neutral' };

const METRICS: Array<{ key: string; label: string }> = [
    { key: 'branches', label: 'Branches' },
    { key: 'users', label: 'Users' },
    { key: 'orders_this_month', label: 'Orders / mo' },
];

export default function UsagePage({ tenants }: { tenants: Paginated<Row> }) {
    const columns: Column<Row>[] = [
        {
            key: 'name',
            label: 'Tenant',
            render: (r) => (
                <Link href={route('platform.tenants.show', r.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                    {r.name}
                </Link>
            ),
        },
        { key: 'plan', label: 'Plan', render: (r) => r.plan ?? '—' },
        { key: 'status', label: 'Account', render: (r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
        ...METRICS.map((metric) => ({
            key: metric.key,
            label: metric.label,
            align: 'right' as const,
            render: (r: Row) => {
                const value = r.metrics[metric.key] ?? 0;
                const limit = r.limits[metric.key];
                const over = limit !== null && value >= limit;
                return (
                    <span className={over ? 'font-medium text-red-600' : 'text-gray-700'}>
                        {value} {limit !== null ? `/ ${limit}` : '/ ∞'}
                    </span>
                );
            },
        })),
        {
            key: 'over_limit',
            label: 'Headroom',
            render: (r) => <Badge tone={r.over_limit ? 'warning' : 'success'}>{r.over_limit ? 'At or over limit' : 'Within limits'}</Badge>,
        },
    ];

    return (
        <PlatformLayout title="Usage & Limits">
            <p className="mb-4 text-sm text-gray-500">Plan usage is enforced on the backend; this view surfaces accounts approaching or exceeding their limits.</p>
            <Card>
                <DataTable columns={columns} rows={tenants.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={tenants.links} />
        </PlatformLayout>
    );
}
