import PlatformLayout from '@/Layouts/PlatformLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface SubscriptionView {
    id: number;
    status: string;
    status_label: string;
    plan: string | null;
    plan_id: number;
    billing_cycle: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    days_remaining: number | null;
    invoices: { number: string; amount: number; status: string; paid_at: string | null }[];
}

export default function TenantShow({
    tenant,
    subscription,
    usage,
    limits,
    plans,
    stats,
    recentActivity,
}: {
    tenant: { id: number; name: string; slug: string; business_email: string; status: string; created_at: string | null; region: { country: string | null; currency: string | null; timezone: string | null } };
    subscription: SubscriptionView | null;
    usage: Record<string, number>;
    limits: Record<string, number | null>;
    plans: { id: number; name: string }[];
    stats: { branches: number; orders: number };
    recentActivity: { action: string; created_at: string | null }[];
}) {
    const [reason, setReason] = useState('');
    const planForm = useForm({
        plan_id: subscription?.plan_id ?? plans[0]?.id ?? 0,
        billing_cycle: subscription?.billing_cycle ?? 'monthly',
    });

    const post = (routeName: string, data: Record<string, any> = {}) =>
        router.post(route(routeName, tenant.id), data, { preserveScroll: true });

    return (
        <PlatformLayout title={tenant.name}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">{tenant.name}</h1>
                    <p className="text-sm text-gray-500">
                        {tenant.slug} · {tenant.business_email} · <span className="capitalize">{tenant.status}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    {tenant.status === 'suspended' ? (
                        <button onClick={() => post('platform.tenants.activate')} className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
                            Activate tenant
                        </button>
                    ) : (
                        <button onClick={() => post('platform.tenants.suspend')} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                            Suspend tenant
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <h2 className="mb-3 text-base font-semibold text-gray-900">Subscription</h2>
                    {subscription ? (
                        <>
                            <dl className="space-y-1 text-sm">
                                <div className="flex justify-between"><dt className="text-gray-500">Plan</dt><dd className="text-gray-800">{subscription.plan}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="text-gray-800">{subscription.status_label}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Cycle</dt><dd className="text-gray-800 capitalize">{subscription.billing_cycle}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Days remaining</dt><dd className="text-gray-800">{subscription.days_remaining ?? '—'}</dd></div>
                            </dl>

                            <div className="mt-4 flex flex-wrap items-end gap-2">
                                <select className="rounded-md border-gray-300 text-sm" value={planForm.data.plan_id} onChange={(e) => planForm.setData('plan_id', Number(e.target.value))}>
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <select className="rounded-md border-gray-300 text-sm" value={planForm.data.billing_cycle} onChange={(e) => planForm.setData('billing_cycle', e.target.value)}>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                                <button onClick={() => planForm.post(route('platform.subscriptions.plan', subscription.id), { preserveScroll: true })} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                    Change plan
                                </button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2 text-sm">
                                <button onClick={() => router.post(route('platform.subscriptions.renew', subscription.id), {}, { preserveScroll: true })} className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700">Renew</button>
                                {subscription.status === 'suspended' ? (
                                    <button onClick={() => router.post(route('platform.subscriptions.reactivate', subscription.id), {}, { preserveScroll: true })} className="rounded-md border border-green-300 px-3 py-1.5 text-green-700">Reactivate</button>
                                ) : (
                                    <button onClick={() => router.post(route('platform.subscriptions.suspend', subscription.id), {}, { preserveScroll: true })} className="rounded-md border border-amber-300 px-3 py-1.5 text-amber-700">Suspend</button>
                                )}
                                <button onClick={() => router.post(route('platform.subscriptions.cancel', subscription.id), {}, { preserveScroll: true })} className="rounded-md border border-red-300 px-3 py-1.5 text-red-700">Cancel</button>
                            </div>

                            {subscription.invoices.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="mb-2 text-sm font-semibold text-gray-700">Invoices</h3>
                                    <ul className="space-y-1 text-sm">
                                        {subscription.invoices.map((inv, i) => (
                                            <li key={i} className="flex justify-between text-gray-600">
                                                <span>{inv.number} <span className="text-xs text-gray-400">({inv.status})</span></span>
                                                <span>{inv.amount.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">No subscription on record.</p>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h2 className="mb-3 text-base font-semibold text-gray-900">Usage vs limits</h2>
                        <ul className="space-y-2 text-sm">
                            {Object.entries(usage).map(([metric, value]) => (
                                <li key={metric} className="flex justify-between">
                                    <span className="capitalize text-gray-500">{metric.replace(/_/g, ' ')}</span>
                                    <span className={limits[metric] !== null && value >= (limits[metric] as number) ? 'font-medium text-red-600' : 'text-gray-800'}>
                                        {value} {limits[metric] !== null ? `/ ${limits[metric]}` : '/ ∞'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h2 className="mb-3 text-base font-semibold text-gray-900">Diagnostics</h2>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Branches</dt><dd className="text-gray-800">{stats.branches}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Orders (all time)</dt><dd className="text-gray-800">{stats.orders}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Region</dt><dd className="text-gray-800">{tenant.region.country ?? '—'} / {tenant.region.currency ?? '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Timezone</dt><dd className="text-gray-800">{tenant.region.timezone ?? '—'}</dd></div>
                        </dl>

                        <h3 className="mt-4 mb-2 text-sm font-semibold text-gray-700">Recent activity</h3>
                        <ul className="space-y-1 text-xs text-gray-500">
                            {recentActivity.map((a, i) => (
                                <li key={i}>{a.action} · {a.created_at ? new Date(a.created_at).toLocaleString() : ''}</li>
                            ))}
                            {recentActivity.length === 0 && <li>No activity recorded.</li>}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-base font-semibold text-gray-900">Support impersonation</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Sign in as this tenant's owner to help them. Time-limited, reason required, and fully audited.
                </p>
                <div className="mt-3 flex items-end gap-2">
                    <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason (required)"
                        className="w-80 rounded-md border-gray-300 text-sm"
                    />
                    <button
                        onClick={() => post('platform.impersonate.start', { reason })}
                        className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                        Impersonate owner
                    </button>
                </div>
            </div>
        </PlatformLayout>
    );
}
