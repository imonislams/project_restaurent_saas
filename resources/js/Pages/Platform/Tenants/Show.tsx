import { ActivityBadge, Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, Tabs, formatDate, formatMoney } from '@/Components/ui';
import type { BadgeTone, TabItem } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { ReactNode, useState } from 'react';

interface TenantHeader {
    id: number;
    name: string;
    slug: string;
    business_email: string;
    status: string;
    status_label: string;
    verified: boolean;
    verified_at: string | null;
    created_at: string | null;
    suspended_at: string | null;
    trial_ends_at: string | null;
    onboarding_completed: boolean;
    region: { country: string | null; currency: string | null; timezone: string | null };
    subscription: {
        id: number;
        status: string;
        status_label: string;
        plan: string | null;
        plan_id: number;
        billing_cycle: string;
        trial_ends_at: string | null;
        current_period_start: string | null;
        current_period_end: string | null;
        days_remaining: number | null;
    } | null;
    counts: { branches: number; users: number; orders: number };
}

interface TabsData {
    overview: { activity: { action: string; user_id: number | null; created_at: string | null }[] };
    subscription: { limits: Record<string, number | null>; history: { action: string; created_at: string | null }[] };
    billing: {
        outstanding: number;
        collected: number;
        billing_contact: { email: string | null; name: string | null };
        invoices: { id: number; number: string; amount: number; currency: string; status: string; issued_at: string | null; paid_at: string | null }[];
    };
    usage: { metrics: Record<string, number>; limits: Record<string, number | null>; history: { metric: string; value: number; recorded_at: string | null }[] };
    security: {
        users: { id: number; name: string; email: string; status: string | null; last_login_at: string | null }[];
        active_sessions: number;
        events: { action: string; user_id: number | null; ip: string | null; created_at: string | null }[];
    };
    diagnostics: {
        config: Record<string, string | number | null>;
        counts: Record<string, number>;
        errors: unknown[];
        queue_failures: unknown[];
        correlation_id: string | null;
    };
    backups: {
        backups: { id: number; path: string; size: string; rows_count: number; verification_result: string | null; verified_at: string | null; created_at: string | null }[];
        restores: { id: number; status: string; reason: string; verification_ok: boolean | null; created_at: string | null }[];
    };
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

const TABS: TabItem[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'billing', label: 'Billing & Payments' },
    { key: 'usage', label: 'Usage' },
    { key: 'security', label: 'Activity & Security' },
    { key: 'diagnostics', label: 'Support & Diagnostics' },
    { key: 'backups', label: 'Backups & Recovery' },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-1 text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-right text-gray-800">{children}</dd>
        </div>
    );
}

export default function TenantShow({ tenant, tabs, plans }: { tenant: TenantHeader; tabs: TabsData; plans: { id: number; name: string }[] }) {
    const [tab, setTab] = useState('overview');
    const [dialog, setDialog] = useState<null | 'suspend' | 'archive' | 'impersonate'>(null);
    const [reason, setReason] = useState('');
    const [subDialog, setSubDialog] = useState<null | 'suspend' | 'reactivate'>(null);
    const [processing, setProcessing] = useState(false);
    const currency = tenant.region.currency ?? 'USD';

    const post = (routeName: string, data: Record<string, unknown> = {}) => {
        setProcessing(true);
        router.post(route(routeName, tenant.id), data as any, {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setDialog(null);
                setReason('');
            },
        });
    };

    const changePlan = (planId: number, cycle: string) => {
        if (!tenant.subscription) return;
        router.post(route('platform.subscriptions.plan', tenant.subscription.id), { plan_id: planId, billing_cycle: cycle }, { preserveScroll: true });
    };

    const subscriptionPost = (routeName: string) => {
        if (!tenant.subscription) return;
        setProcessing(true);
        router.post(route(routeName, tenant.subscription.id), {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setSubDialog(null);
            },
        });
    };

    const limits = tabs.usage.limits;

    return (
        <PlatformLayout title={tenant.name}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900">{tenant.name}</h1>
                        <Badge tone={STATUS_TONE[tenant.status] ?? 'neutral'}>{tenant.status_label}</Badge>
                        <Badge tone={tenant.verified ? 'success' : 'warning'}>{tenant.verified ? 'Verified' : 'Unverified'}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                        {tenant.slug} · {tenant.business_email} · created {formatDate(tenant.created_at)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {!tenant.verified && (
                        <Button size="sm" variant="secondary" loading={processing} onClick={() => post('platform.tenants.verify')}>
                            Verify
                        </Button>
                    )}
                    {tenant.status === 'suspended' ? (
                        <Button size="sm" loading={processing} onClick={() => post('platform.tenants.activate')}>
                            Reactivate
                        </Button>
                    ) : (
                        <Button size="sm" variant="danger" onClick={() => setDialog('suspend')}>
                            Suspend
                        </Button>
                    )}
                    {tenant.status !== 'archived' && (
                        <Button size="sm" variant="ghost" onClick={() => setDialog('archive')}>
                            Archive
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDialog('impersonate')}>
                        Impersonate
                    </Button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-3 lg:w-1/2">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-gray-500">Branches</div>
                    <div className="text-lg font-semibold text-gray-900">{tenant.counts.branches}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-gray-500">Users</div>
                    <div className="text-lg font-semibold text-gray-900">{tenant.counts.users}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-gray-500">Orders</div>
                    <div className="text-lg font-semibold text-gray-900">{tenant.counts.orders}</div>
                </div>
            </div>

            <Tabs className="mt-6" tabs={TABS} value={tab} onChange={setTab} />

            <div className="mt-5">
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Business profile" />
                            <CardBody>
                                <dl className="divide-y divide-gray-50">
                                    <Row label="Legal / business name">{tenant.name}</Row>
                                    <Row label="Identifier">{tenant.slug}</Row>
                                    <Row label="Business email">{tenant.business_email}</Row>
                                    <Row label="Country">{tenant.region.country ?? '—'}</Row>
                                    <Row label="Timezone">{tenant.region.timezone ?? '—'}</Row>
                                    <Row label="Currency">{tenant.region.currency ?? '—'}</Row>
                                    <Row label="Onboarding">{tenant.onboarding_completed ? 'Completed' : 'Incomplete'}</Row>
                                    <Row label="Verified at">{tenant.verified_at ? formatDate(tenant.verified_at) : '—'}</Row>
                                    <Row label="Suspended at">{tenant.suspended_at ? formatDate(tenant.suspended_at) : '—'}</Row>
                                </dl>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHeader title="Recent activity" description="Audited events for this tenant" />
                            <CardBody className="space-y-1.5">
                                {tabs.overview.activity.map((event, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <ActivityBadge action={event.action} />
                                        <span className="text-xs text-gray-400">{formatDate(event.created_at)}</span>
                                    </div>
                                ))}
                                {tabs.overview.activity.length === 0 && <p className="text-sm text-gray-500">No activity recorded.</p>}
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'subscription' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Current subscription" />
                            <CardBody>
                                {tenant.subscription ? (
                                    <dl className="divide-y divide-gray-50">
                                        <Row label="Plan">{tenant.subscription.plan ?? '—'}</Row>
                                        <Row label="Status">
                                            <Badge tone={SUB_STATUS_TONE[tenant.subscription.status] ?? 'neutral'}>{tenant.subscription.status_label}</Badge>
                                        </Row>
                                        <Row label="Billing cycle">{tenant.subscription.billing_cycle}</Row>
                                        <Row label="Period end">{formatDate(tenant.subscription.current_period_end)}</Row>
                                        <Row label="Days remaining">{tenant.subscription.days_remaining ?? '—'}</Row>
                                    </dl>
                                ) : (
                                    <p className="text-sm text-gray-500">No subscription on record.</p>
                                )}

                                {tenant.subscription && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button size="sm" variant="secondary" loading={processing} onClick={() => router.post(route('platform.subscriptions.renew', tenant.subscription!.id), {}, { preserveScroll: true })}>
                                            Renew
                                        </Button>
                                        {tenant.subscription.status === 'suspended' ? (
                                            <Button size="sm" variant="secondary" onClick={() => setSubDialog('reactivate')}>
                                                Reactivate
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="danger" onClick={() => setSubDialog('suspend')}>
                                                Suspend
                                            </Button>
                                        )}
                                        <Button size="sm" variant="ghost" onClick={() => router.post(route('platform.subscriptions.cancel', tenant.subscription!.id), {}, { preserveScroll: true })}>
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader title="Change plan" description="Entitlements are re-resolved server-side" />
                            <CardBody>
                                <div className="flex flex-wrap items-end gap-2">
                                    <select
                                        className="rounded-md border-gray-300 text-sm"
                                        value={tenant.subscription?.plan_id ?? plans[0]?.id}
                                        onChange={(e) => tenant.subscription && changePlan(Number(e.target.value), tenant.subscription.billing_cycle)}
                                    >
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button size="sm" variant="secondary" onClick={() => tenant.subscription && changePlan(tenant.subscription.plan_id, tenant.subscription.billing_cycle === 'monthly' ? 'yearly' : 'monthly')}>
                                        Toggle cycle
                                    </Button>
                                </div>

                                <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-700">Plan limits</h3>
                                <dl className="divide-y divide-gray-50">
                                    {Object.entries(tabs.subscription.limits).map(([metric, limit]) => (
                                        <Row key={metric} label={metric.replace(/_/g, ' ')}>
                                            {limit ?? '∞'}
                                        </Row>
                                    ))}
                                </dl>

                                {tabs.subscription.history.length > 0 && (
                                    <>
                                        <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-700">Lifecycle history</h3>
                                        <ul className="space-y-1 text-xs text-gray-500">
                                            {tabs.subscription.history.map((h, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <ActivityBadge action={h.action} />
                                                    <span>{formatDate(h.created_at)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'billing' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <Card>
                            <CardHeader title="Balances" />
                            <CardBody>
                                <dl className="divide-y divide-gray-50">
                                    <Row label="Outstanding">{formatMoney(tabs.billing.outstanding, currency)}</Row>
                                    <Row label="Collected (all time)">{formatMoney(tabs.billing.collected, currency)}</Row>
                                    <Row label="Billing contact">{tabs.billing.billing_contact.email ?? '—'}</Row>
                                </dl>
                            </CardBody>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader title="Invoices" description="Platform invoices issued to this tenant" />
                            <CardBody>
                                {tabs.billing.invoices.length ? (
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="py-2">Number</th>
                                                <th className="py-2">Status</th>
                                                <th className="py-2 text-right">Amount</th>
                                                <th className="py-2">Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {tabs.billing.invoices.map((invoice) => (
                                                <tr key={invoice.id}>
                                                    <td className="py-2 font-medium text-gray-700">{invoice.number}</td>
                                                    <td className="py-2 text-gray-600">{invoice.status}</td>
                                                    <td className="py-2 text-right tabular-nums text-gray-700">{formatMoney(invoice.amount, invoice.currency)}</td>
                                                    <td className="py-2 text-gray-500">{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-sm text-gray-500">No invoices yet.</p>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'usage' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Usage vs limits" />
                            <CardBody>
                                <ul className="space-y-2 text-sm">
                                    {Object.entries(tabs.usage.metrics).map(([metric, value]) => (
                                        <li key={metric} className="flex justify-between">
                                            <span className="capitalize text-gray-500">{metric.replace(/_/g, ' ')}</span>
                                            <span className={limits[metric] !== null && value >= (limits[metric] as number) ? 'font-medium text-red-600' : 'text-gray-800'}>
                                                {value} {limits[metric] !== null ? `/ ${limits[metric]}` : '/ ∞'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHeader title="Usage history" description="Scheduled snapshots" />
                            <CardBody>
                                {tabs.usage.history.length ? (
                                    <ul className="space-y-1 text-xs text-gray-500">
                                        {tabs.usage.history.map((h, i) => (
                                            <li key={i} className="flex justify-between">
                                                <span>
                                                    {h.metric} = {h.value}
                                                </span>
                                                <span>{formatDate(h.recorded_at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500">No usage snapshots recorded yet.</p>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'security' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Users & sessions" description={`${tabs.security.active_sessions} active session(s)`} />
                            <CardBody>
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="py-2">User</th>
                                            <th className="py-2">Status</th>
                                            <th className="py-2">Last login</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tabs.security.users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="py-2">
                                                    <div className="text-gray-700">{user.name}</div>
                                                    <div className="text-xs text-gray-400">{user.email}</div>
                                                </td>
                                                <td className="py-2 text-gray-600">{user.status ?? '—'}</td>
                                                <td className="py-2 text-gray-500">{user.last_login_at ? formatDate(user.last_login_at) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHeader title="Security events" description="Recent audited events" />
                            <CardBody className="space-y-1.5">
                                {tabs.security.events.map((event, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <ActivityBadge action={event.action} />
                                        <span className="text-xs text-gray-400">
                                            {event.ip ?? ''} {formatDate(event.created_at)}
                                        </span>
                                    </div>
                                ))}
                                {tabs.security.events.length === 0 && <p className="text-sm text-gray-500">No events recorded.</p>}
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'diagnostics' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Safe configuration" description="No secrets are exposed here" />
                            <CardBody>
                                <dl className="divide-y divide-gray-50">
                                    {Object.entries(tabs.diagnostics.config).map(([key, value]) => (
                                        <Row key={key} label={key.replace(/_/g, ' ')}>
                                            {value === null || value === '' ? '—' : String(value)}
                                        </Row>
                                    ))}
                                </dl>
                                <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-700">Counts</h3>
                                <dl className="divide-y divide-gray-50">
                                    {Object.entries(tabs.diagnostics.counts).map(([key, value]) => (
                                        <Row key={key} label={key.replace(/_/g, ' ')}>
                                            {value}
                                        </Row>
                                    ))}
                                </dl>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHeader title="Errors & queue" description="Log correlation arrives with system operations (Phase 6)" />
                            <CardBody className="space-y-2 text-sm text-gray-500">
                                <p>Recent application errors: not yet correlated to tenants.</p>
                                <p>Queue failures: not yet correlated to tenants.</p>
                                <p>Correlation ID: —</p>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {tab === 'backups' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader
                                title="Tenant backups"
                                action={
                                    <Button size="sm" onClick={() => router.post(route('platform.backups.tenant', tenant.id), {}, { preserveScroll: true })}>
                                        Create backup
                                    </Button>
                                }
                            />
                            <CardBody className="space-y-2">
                                {tabs.backups.backups.map((backup) => (
                                    <div key={backup.id} className="flex items-center justify-between gap-3 text-sm">
                                        <div className="min-w-0">
                                            <div className="truncate font-mono text-xs text-gray-600">{backup.path}</div>
                                            <div className="text-xs text-gray-400">{backup.rows_count} rows · {backup.size} · {formatDate(backup.created_at)}</div>
                                        </div>
                                        <Badge tone={backup.verification_result === 'ok' ? 'success' : backup.verification_result === 'failed' ? 'danger' : 'warning'}>
                                            {backup.verification_result ?? 'unverified'}
                                        </Badge>
                                    </div>
                                ))}
                                {tabs.backups.backups.length === 0 && <p className="text-sm text-gray-500">No backups for this tenant yet.</p>}
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader
                                title="Restore history"
                                action={
                                    <Link href={route('platform.restores.index')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                        Restore center
                                    </Link>
                                }
                            />
                            <CardBody className="space-y-2">
                                {tabs.backups.restores.map((restore) => (
                                    <Link key={restore.id} href={route('platform.restores.show', restore.id)} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="truncate text-gray-700">{restore.reason}</span>
                                        <Badge tone={restore.status === 'completed' ? 'success' : restore.status === 'failed' ? 'danger' : 'warning'}>{restore.status}</Badge>
                                    </Link>
                                ))}
                                {tabs.backups.restores.length === 0 && <p className="text-sm text-gray-500">No restores recorded.</p>}
                            </CardBody>
                        </Card>
                    </div>
                )}
            </div>

            <ConfirmDialog
                show={dialog === 'suspend'}
                title={`Suspend ${tenant.name}?`}
                description="This blocks all tenant users from signing in and using the POS. Tenant data is retained — nothing is deleted. Existing sessions are re-checked on their next request."
                confirmLabel="Suspend tenant"
                processing={processing}
                requireText={tenant.slug}
                onConfirm={() => post('platform.tenants.suspend', { reason })}
                onClose={() => setDialog(null)}
            >
                <label className="text-xs font-medium text-gray-500">Reason (required)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 text-sm" />
            </ConfirmDialog>

            <ConfirmDialog
                show={dialog === 'archive'}
                title={`Archive ${tenant.name}?`}
                description="Archiving sets the account to archived and blocks access. Data is retained for retention-policy purposes."
                confirmLabel="Archive tenant"
                processing={processing}
                requireText={tenant.slug}
                onConfirm={() => post('platform.tenants.archive')}
                onClose={() => setDialog(null)}
            />

            <ConfirmDialog
                show={dialog === 'impersonate'}
                title={`Impersonate ${tenant.name}?`}
                description="Sign in as this tenant's owner for support. Time-limited, reason required, and fully audited."
                confirmLabel="Start impersonation"
                tone="primary"
                processing={processing}
                onConfirm={() => post('platform.impersonate.start', { reason })}
                onClose={() => setDialog(null)}
            >
                <label className="text-xs font-medium text-gray-500">Reason (required)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 text-sm" />
            </ConfirmDialog>

            <ConfirmDialog
                show={subDialog === 'suspend'}
                title={`Suspend ${tenant.name}'s subscription?`}
                description="Suspending the subscription immediately suspends the tenant and blocks access. Billing records are kept."
                confirmLabel="Suspend subscription"
                processing={processing}
                onConfirm={() => subscriptionPost('platform.subscriptions.suspend')}
                onClose={() => setSubDialog(null)}
            />

            <ConfirmDialog
                show={subDialog === 'reactivate'}
                title={`Reactivate ${tenant.name}'s subscription?`}
                description="This restores access for the tenant. Any outstanding invoices are unchanged."
                confirmLabel="Reactivate subscription"
                tone="primary"
                processing={processing}
                onConfirm={() => subscriptionPost('platform.subscriptions.reactivate')}
                onClose={() => setSubDialog(null)}
            />
        </PlatformLayout>
    );
}
