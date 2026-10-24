import { Badge, Button, Card, DataTable, Drawer, FilterBar, Pagination, SelectField } from '@/Components/ui';
import type { BadgeTone, Column, PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface ConflictRow {
    id: number;
    type: string;
    status: string;
    message: string;
    offline_uuid: string;
    operation_type: string;
    order_reference: string | null;
    order: { id: number; order_number: string } | null;
    tenant: string | null;
    branch: string | null;
    expected: Record<string, unknown> | null;
    actual: Record<string, unknown> | null;
    resolved_at: string | null;
    resolution_note: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

const TONE: Record<string, BadgeTone> = {
    total_mismatch: 'warning',
    stock_insufficient: 'danger',
    shift_closed: 'danger',
    table_occupied: 'warning',
    product_unavailable: 'danger',
    rejected: 'neutral',
};

const LABEL: Record<string, string> = {
    total_mismatch: 'Total mismatch',
    stock_insufficient: 'Insufficient stock',
    shift_closed: 'Shift closed',
    table_occupied: 'Table occupied',
    product_unavailable: 'Product unavailable',
    rejected: 'Rejected',
};

const fmt = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function OfflineConflicts({
    conflicts,
    filters,
    summary,
    types,
}: {
    conflicts: Paginated<ConflictRow>;
    filters: { status: string; type: string };
    summary: { open: number; resolved: number };
    types: string[];
}) {
    const [state, setState] = useState(filters);
    const [reviewing, setReviewing] = useState<ConflictRow | null>(null);

    const form = useForm({ note: '' });

    const apply = (overrides: Partial<typeof state> = {}) => {
        const next = { ...state, ...overrides };
        setState(next);
        router.get(route('platform.offline-conflicts.index'), next, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const columns: Column<ConflictRow>[] = [
        {
            key: 'type',
            label: 'Type',
            render: (r) => <Badge tone={TONE[r.type] ?? 'neutral'}>{LABEL[r.type] ?? r.type}</Badge>,
        },
        { key: 'message', label: 'What differed', render: (r) => <span className="text-xs text-foreground">{r.message}</span> },
        {
            key: 'order',
            label: 'Order',
            render: (r) => (
                <span className="text-xs text-muted-foreground">
                    {r.order?.order_number ?? r.order_reference ?? '—'}
                    {r.order?.order_number && r.order_reference && r.order_reference !== r.order.order_number ? (
                        <span className="block text-[10.5px] text-muted-foreground/70">device: {r.order_reference}</span>
                    ) : null}
                </span>
            ),
        },
        { key: 'tenant', label: 'Tenant', render: (r) => <span className="text-xs text-muted-foreground">{r.tenant ?? '—'}</span> },
        { key: 'branch', label: 'Branch', render: (r) => <span className="text-xs text-muted-foreground">{r.branch ?? '—'}</span> },
        { key: 'created_at', label: 'When', render: (r) => <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span> },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
                <button
                    type="button"
                    onClick={() => {
                        form.setData('note', '');
                        form.clearErrors();
                        setReviewing(r);
                    }}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                >
                    {r.status === 'open' ? 'Review' : 'View'}
                </button>
            ),
        },
    ];

    return (
        <PlatformLayout
            title="Offline Sync Conflicts"
            description="Operations taken offline and replayed by the server. The server is authoritative for money; anything it resolved differently is listed here for review."
        >
            <FilterBar>
                <SelectField
                    label="Status"
                    value={state.status}
                    options={[
                        { value: 'open', label: `Open (${summary.open})` },
                        { value: 'resolved', label: `Resolved (${summary.resolved})` },
                        { value: 'all', label: 'All' },
                    ]}
                    onChange={(v) => apply({ status: v })}
                />
                <SelectField
                    label="Type"
                    value={state.type}
                    options={[{ value: '', label: 'Any type' }, ...types.map((type) => ({ value: type, label: LABEL[type] ?? type }))]}
                    onChange={(v) => apply({ type: v })}
                />
            </FilterBar>

            <Card>
                <DataTable columns={columns} rows={conflicts.data} rowKey={(r) => r.id} />
            </Card>
            <Pagination links={conflicts.links} />

            <Drawer
                show={reviewing !== null}
                onClose={() => setReviewing(null)}
                width="max-w-xl"
                title={reviewing ? (LABEL[reviewing.type] ?? reviewing.type) : 'Conflict'}
            >
                {reviewing ? (
                    <div className="space-y-4">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm sm:grid-cols-2">
                            <div className="flex gap-2 sm:col-span-2">
                                <dt className="shrink-0 text-muted-foreground">Detail:</dt>
                                <dd className="font-medium text-foreground">{reviewing.message}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Tenant:</dt>
                                <dd className="truncate font-medium text-foreground">{reviewing.tenant ?? '—'}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Branch:</dt>
                                <dd className="truncate font-medium text-foreground">{reviewing.branch ?? '—'}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Order:</dt>
                                <dd className="font-medium text-foreground">{reviewing.order?.order_number ?? '—'}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Captured:</dt>
                                <dd className="font-medium text-foreground">{fmt(reviewing.created_at)}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Operation:</dt>
                                <dd className="font-medium text-foreground">{reviewing.operation_type}</dd>
                            </div>
                            <div className="flex gap-2">
                                <dt className="text-muted-foreground">Device ref:</dt>
                                <dd className="truncate font-mono text-xs text-foreground">{reviewing.offline_uuid}</dd>
                            </div>
                        </dl>

                        {(reviewing.expected || reviewing.actual) && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border p-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Device</p>
                                    <pre className="overflow-auto text-xs text-foreground">{JSON.stringify(reviewing.expected, null, 2)}</pre>
                                </div>
                                <div className="rounded-lg border border-border p-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Server</p>
                                    <pre className="overflow-auto text-xs text-foreground">{JSON.stringify(reviewing.actual, null, 2)}</pre>
                                </div>
                            </div>
                        )}

                        {reviewing.status === 'open' ? (
                            <div className="space-y-2">
                                <label htmlFor="resolution-note" className="block text-xs font-medium text-muted-foreground">
                                    Review note (optional)
                                </label>
                                <textarea
                                    id="resolution-note"
                                    rows={3}
                                    value={form.data.note}
                                    onChange={(e) => form.setData('note', e.target.value)}
                                    placeholder="What was decided about this difference?"
                                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {form.errors.note && <span className="block text-xs text-destructive">{form.errors.note}</span>}

                                <Button
                                    size="sm"
                                    loading={form.processing}
                                    onClick={() =>
                                        form.post(route('platform.offline-conflicts.resolve', reviewing.id), {
                                            preserveScroll: true,
                                            onSuccess: () => setReviewing(null),
                                        })
                                    }
                                >
                                    Mark as reviewed
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                                <p className="text-xs font-semibold text-foreground">Reviewed {fmt(reviewing.resolved_at)}</p>
                                {reviewing.resolution_note && (
                                    <p className="mt-1 text-xs text-muted-foreground">{reviewing.resolution_note}</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : null}
            </Drawer>
        </PlatformLayout>
    );
}
