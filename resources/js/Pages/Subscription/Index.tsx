import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, PageHeader, formatDate, formatMoney } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface PlanView {
    id: number;
    name: string;
    description: string | null;
    currency: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    features: string[];
    limits: Record<string, number | null>;
}

interface SubscriptionView {
    id: number;
    plan: string | null;
    plan_id: number;
    status: string;
    status_label: string;
    billing_cycle: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    days_remaining: number | null;
    cancel_at_period_end: boolean;
}

interface InvoiceView {
    id: number;
    number: string;
    amount: number;
    currency: string;
    status: string;
    status_label: string;
    issued_at: string | null;
    paid_at: string | null;
    outstanding: number;
}

export default function SubscriptionIndex({
    subscription,
    usage,
    limits,
    plans,
    invoices,
    gateways,
}: {
    subscription: SubscriptionView | null;
    usage: Record<string, number>;
    limits: Record<string, number | null>;
    plans: PlanView[];
    invoices: InvoiceView[];
    gateways: { value: string; label: string }[];
}) {
    const tenant = (usePage().props as any).tenant;
    const [pending, setPending] = useState<PlanView | null>(null);
    const [cycle, setCycle] = useState(subscription?.billing_cycle ?? 'monthly');

    const switchPlan = () => {
        if (!pending) return;
        router.post(route('subscription.plan'), { plan_id: pending.id, billing_cycle: cycle }, { preserveScroll: true, onFinish: () => setPending(null) });
    };

    const pay = (invoice: InvoiceView, gatewayId: string) =>
        router.post(route('subscription.pay', invoice.id), { gateway_id: gatewayId }, { preserveScroll: true });

    return (
        <AuthenticatedLayout header={<PageHeader title="Subscription" description={`${tenant?.name ?? 'Your restaurant'} · manage your plan, view usage and pay invoices online.`} />}>
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader title="Current plan" />
                        <CardBody>
                            {subscription ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-gray-900">{subscription.plan ?? '—'}</span>
                                    <Badge tone={subscription.status === 'active' ? 'success' : subscription.status === 'trialing' ? 'info' : 'warning'}>{subscription.status_label}</Badge>
                                    <span className="text-sm text-gray-500">
                                        · {subscription.billing_cycle} · renews {formatDate(subscription.current_period_end)}
                                        {subscription.days_remaining !== null ? ` (${subscription.days_remaining}d)` : ''}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No subscription on record.</p>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Usage" description="This billing period" />
                        <CardBody className="space-y-2">
                            {Object.entries(usage).map(([metric, value]) => {
                                const limit = limits[metric];
                                const over = limit !== null && limit !== undefined && value >= limit;
                                return (
                                    <div key={metric} className="flex items-center justify-between text-sm">
                                        <span className="capitalize text-gray-500">{metric.replace(/_/g, ' ')}</span>
                                        <span className={over ? 'font-medium text-red-600' : 'text-gray-800'}>{value} {limit !== null && limit !== undefined ? `/ ${limit}` : '/ ∞'}</span>
                                    </div>
                                );
                            })}
                        </CardBody>
                    </Card>
                </div>

                <h2 className="mb-3 text-sm font-semibold text-gray-800">Change plan</h2>
                <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => {
                        const isCurrent = subscription?.plan_id === plan.id;
                        return (
                            <Card key={plan.id} className={isCurrent ? 'ring-2 ring-indigo-500' : ''}>
                                <CardBody>
                                    <div className="flex items-start justify-between">
                                        <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                                        {isCurrent && <Badge tone="info">Current</Badge>}
                                    </div>
                                    <div className="mt-2 flex items-end gap-1">
                                        <span className="text-2xl font-semibold text-gray-900">{plan.currency} {plan.price_monthly.toFixed(2)}</span>
                                        <span className="pb-0.5 text-sm text-gray-400">/ mo</span>
                                    </div>
                                    <p className="text-xs text-gray-500">or {plan.currency} {plan.price_yearly.toFixed(2)} / year · {plan.trial_days}-day trial</p>
                                    {plan.features.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {plan.features.map((feature) => (
                                                <span key={feature} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{feature}</span>
                                            ))}
                                        </div>
                                    )}
                                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                        <div><dt className="text-gray-400">Branches</dt><dd className="font-semibold text-gray-800">{plan.limits.branches ?? '∞'}</dd></div>
                                        <div><dt className="text-gray-400">Users</dt><dd className="font-semibold text-gray-800">{plan.limits.users ?? '∞'}</dd></div>
                                        <div><dt className="text-gray-400">Orders/mo</dt><dd className="font-semibold text-gray-800">{plan.limits.orders_this_month ?? '∞'}</dd></div>
                                    </dl>
                                    <Button size="sm" className="mt-4 w-full" variant={isCurrent ? 'secondary' : 'primary'} disabled={isCurrent} onClick={() => setPending(plan)}>
                                        {isCurrent ? 'Current plan' : 'Switch to this plan'}
                                    </Button>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader title="Invoices" description="Pay open invoices online" />
                    <CardBody>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 bg-gray-50/60 text-[11px] uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Invoice</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2 text-right">Amount</th>
                                    <th className="px-3 py-2">Issued</th>
                                    <th className="px-3 py-2 text-right">Pay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/70">
                                        <td className="px-3 py-2.5 font-medium text-gray-800">{invoice.number}</td>
                                        <td className="px-3 py-2.5"><Badge tone={invoice.status === 'paid' ? 'success' : 'warning'}>{invoice.status_label}</Badge></td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatMoney(invoice.amount, invoice.currency)}</td>
                                        <td className="px-3 py-2.5 text-gray-500">{formatDate(invoice.issued_at)}</td>
                                        <td className="px-3 py-2.5 text-right">
                                            {invoice.status === 'paid' ? (
                                                <span className="text-xs text-gray-300">Paid</span>
                                            ) : gateways.length === 0 ? (
                                                <span className="text-xs text-gray-400">No gateway</span>
                                            ) : (
                                                <select defaultValue="" onChange={(e) => e.target.value && pay(invoice, e.target.value)} className="rounded-lg border-gray-300 text-xs">
                                                    <option value="">Pay with…</option>
                                                    {gateways.map((gateway) => (
                                                        <option key={gateway.value} value={gateway.value}>{gateway.label}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && (
                                    <tr><td colSpan={5} className="py-6 text-center text-gray-500">No invoices yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            </div>

            <ConfirmDialog
                show={pending !== null}
                title={`Switch to ${pending?.name ?? ''}?`}
                description="Your plan changes immediately and a new invoice is issued for the current period at the new price. There is no proration."
                confirmLabel="Switch plan"
                tone="primary"
                onConfirm={switchPlan}
                onClose={() => setPending(null)}
            >
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500">Billing cycle</span>
                    <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="block w-full rounded-lg border-gray-300 text-sm">
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </label>
            </ConfirmDialog>
        </AuthenticatedLayout>
    );
}
