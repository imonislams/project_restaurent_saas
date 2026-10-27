import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    ConfirmDialog,
    DataTable,
    EmptyState,
    KpiCard,
    PageHeader,
    Tabs,
    formatDate,
    formatMoney,
} from '@/Components/ui';
import type { BadgeTone, Column, SortState } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { cn } from '@/Components/ui/cn';

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
    provider: string | null;
}

interface PendingPlanView {
    plan: string | null;
    plan_id: number;
    billing_cycle: string | null;
    invoice_id: number | null;
    invoice_number: string | null;
    since: string | null;
}

interface GatewayOption {
    value: string;
    label: string;
    provider: string;
    is_default: boolean;
}

interface InvoiceView {
    id: number;
    number: string;
    amount: number;
    subtotal: number;
    discount_amount: number;
    currency: string;
    status: string;
    status_label: string;
    issued_at: string | null;
    due_date: string | null;
    paid_at: string | null;
    outstanding: number;
    download_url: string;
    gateways: GatewayOption[];
}

interface PaymentView {
    id: number;
    gateway: string;
    amount: number;
    currency: string;
    status: string;
    status_label: string;
    provider_ref: string | null;
    paid_at: string | null;
    failure_reason: string | null;
    invoice_id: number | null;
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

const PAYMENT_TONE: Record<string, BadgeTone> = {
    succeeded: 'success',
    pending: 'warning',
    processing: 'warning',
    failed: 'danger',
    cancelled: 'neutral',
    expired: 'neutral',
    refunded: 'neutral',
    partially_refunded: 'warning',
};

const INVOICE_TONE: Record<string, BadgeTone> = {
    paid: 'success',
    open: 'warning',
    issued: 'warning',
    partially_paid: 'warning',
    overdue: 'danger',
    void: 'neutral',
    draft: 'neutral',
    refunded: 'neutral',
};

const limitLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function SubscriptionIndex({
    subscription,
    pending_plan,
    usage,
    limits,
    plans,
    invoices,
    payments,
    gateways,
    currency,
    billing,
    access_granted,
}: {
    subscription: SubscriptionView | null;
    pending_plan: PendingPlanView | null;
    usage: Record<string, number>;
    limits: Record<string, number | null>;
    plans: PlanView[];
    invoices: InvoiceView[];
    payments: PaymentView[];
    gateways: GatewayOption[];
    currency: string;
    billing: { country: string | null; configured: boolean; settings_url: string };
    access_granted: boolean;
}) {
    const tenant = (usePage().props as any).tenant;
    const [pending, setPending] = useState<PlanView | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>((subscription?.billing_cycle as 'monthly' | 'yearly') ?? 'monthly');
    const [invoiceGateway, setInvoiceGateway] = useState<Record<number, string>>({});
    const [invoiceReferences, setInvoiceReferences] = useState<Record<number, string>>({});

    const switchPlan = () => {
        if (!pending) return;
        router.post(route('subscription.plan'), { plan_id: pending.id, billing_cycle: cycle }, { preserveScroll: true, onFinish: () => setPending(null) });
    };

    // Each invoice is paid with a gateway eligible for *its* currency.
    const gatewayFor = (invoice: InvoiceView) =>
        invoiceGateway[invoice.id] ?? invoice.gateways.find((g) => g.is_default)?.value ?? invoice.gateways[0]?.value ?? '';

    const pay = (invoice: InvoiceView) => {
        const gatewayId = gatewayFor(invoice);
        if (!gatewayId) return;
        router.post(
            route('subscription.pay', invoice.id),
            { gateway_id: gatewayId, reference: invoiceReferences[invoice.id] ?? '' },
            { preserveScroll: true },
        );
    };

    const priceFor = (plan: PlanView) => (cycle === 'yearly' ? plan.price_yearly : plan.price_monthly);
    const periodLabel = subscription?.cancel_at_period_end ? 'Access ends' : 'Renews';

    const unpaid = invoices.filter((i) => i.status !== 'paid' && i.outstanding > 0);
    const unpaidWithoutMethod = unpaid.filter((i) => i.gateways.length === 0);
    const missingCurrencies = Array.from(new Set(unpaidWithoutMethod.map((i) => i.currency))).join(', ');

    const invoiceColumns: Column<InvoiceView>[] = [
        { key: 'number', label: 'Invoice', render: (r) => <span className="font-medium text-foreground">{r.number}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={INVOICE_TONE[r.status] ?? 'neutral'}>{r.status_label}</Badge> },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="tabular-nums">{formatMoney(r.amount, r.currency)}</span> },
        { key: 'issued_at', label: 'Issued', render: (r) => formatDate(r.issued_at) },
        { key: 'due_date', label: 'Due', render: (r) => (r.due_date ? formatDate(r.due_date) : '—') },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => {
                if (r.status === 'paid' || r.outstanding <= 0) {
                    return (
                        <Button size="xs" variant="ghost" external href={r.download_url} icon={<Download className="h-3.5 w-3.5" />}>
                            PDF
                        </Button>
                    );
                }

                const chosenGateway = r.gateways.find((gateway) => gateway.value === gatewayFor(r));

                return (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button size="xs" variant="ghost" external href={r.download_url} icon={<Download className="h-3.5 w-3.5" />}>
                            PDF
                        </Button>
                        {chosenGateway?.provider === 'manual' && (
                            <input
                                value={invoiceReferences[r.id] ?? ''}
                                onChange={(event) => setInvoiceReferences((state) => ({ ...state, [r.id]: event.target.value }))}
                                placeholder="Transfer reference"
                                aria-label={`Transfer reference for invoice ${r.number}`}
                                className="h-7 w-36 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        )}
                        {r.gateways.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No method for {r.currency}</span>
                        ) : r.gateways.length === 1 ? (
                            <Button size="xs" variant="outline" onClick={() => pay(r)}>
                                Pay
                            </Button>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <select
                                    value={gatewayFor(r)}
                                    onChange={(e) => setInvoiceGateway((s) => ({ ...s, [r.id]: e.target.value }))}
                                    aria-label={`Payment method for invoice ${r.number}`}
                                    className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {r.gateways.map((g) => (
                                        <option key={g.value} value={g.value}>
                                            {g.label}
                                        </option>
                                    ))}
                                </select>
                                <Button size="xs" variant="outline" onClick={() => pay(r)}>
                                    Pay
                                </Button>
                            </div>
                        )}
                    </div>
                );
            },
        },
    ];

    const paymentColumns: Column<PaymentView>[] = [
        { key: 'gateway', label: 'Method' },
        { key: 'provider_ref', label: 'Reference', render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.provider_ref ?? '—'}</span> },
        { key: 'amount', label: 'Amount', align: 'right', render: (r) => <span className="tabular-nums">{formatMoney(r.amount, r.currency)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge tone={PAYMENT_TONE[r.status] ?? 'neutral'}>{r.status_label}</Badge> },
        { key: 'paid_at', label: 'Date', render: (r) => (r.paid_at ? formatDate(r.paid_at) : '—') },
        {
            key: 'retry',
            label: '',
            align: 'right',
            render: (r) => {
                const invoice = invoices.find((i) => i.id === r.invoice_id && i.status !== 'paid' && i.outstanding > 0);
                if (r.status === 'failed' && invoice && invoice.gateways.length > 0) {
                    return (
                        <Button size="xs" variant="outline" onClick={() => pay(invoice)} icon={<RefreshCw className="h-3.5 w-3.5" />}>
                            Retry
                        </Button>
                    );
                }
                return null;
            },
        },
    ];

    const sort: SortState | undefined = undefined;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Subscription & Billing"
                    description={`${tenant?.name ?? 'Your restaurant'} · manage your plan, payment method, invoices and renewal.`}
                />
            }
        >
            <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
                {unpaidWithoutMethod.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No payment method supports {missingCurrencies}.{' '}
                        {billing.configured ? (
                            'Ask your platform administrator to enable a gateway for this currency, or contact support.'
                        ) : (
                            <>
                                Add your{' '}
                                <Link href={billing.settings_url} className="font-semibold underline underline-offset-4">
                                    billing details
                                </Link>{' '}
                                to unlock online payment.
                            </>
                        )}
                    </div>
                )}

                {!access_granted && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                        <p className="font-semibold">
                            {subscription === null ? 'Your account has no plan yet.' : 'Your subscription is not active, so the workspace is closed.'}
                        </p>
                        <p className="mt-1">
                            This page stays available: choose a plan below and settle the outstanding invoice — the workspace unlocks as
                            soon as the payment is confirmed.
                        </p>
                    </div>
                )}

                {subscription && (subscription.status === 'past_due' || subscription.status === 'grace_period') && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Your last payment could not be completed. Please settle the outstanding invoice below to keep your service active.
                    </div>
                )}

                {pending_plan && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                        Your change to <span className="font-semibold">{pending_plan.plan}</span> is pending. Your current plan stays active until you
                        settle {pending_plan.invoice_number ? `invoice ${pending_plan.invoice_number}` : 'its invoice'} below — the new plan activates
                        automatically once that payment is confirmed.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader
                            title="Current plan"
                            action={
                                subscription && (
                                    <div className="flex items-center gap-2">
                                        {subscription.cancel_at_period_end ? (
                                            <Button size="xs" variant="outline" onClick={() => router.post(route('subscription.resume'), {}, { preserveScroll: true })}>
                                                Resume renewal
                                            </Button>
                                        ) : (
                                            <Button size="xs" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
                                                Cancel renewal
                                            </Button>
                                        )}
                                    </div>
                                )
                            }
                        />
                        <CardBody className="space-y-4">
                            {subscription ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-lg font-semibold tracking-tight text-foreground">{subscription.plan ?? '—'}</span>
                                        <Badge tone={STATUS_TONE[subscription.status] ?? 'neutral'}>{subscription.status_label}</Badge>
                                        <span className="text-sm capitalize text-muted-foreground">{subscription.billing_cycle}</span>
                                        {subscription.provider && <Badge tone="neutral">{subscription.provider}</Badge>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                                        <div>
                                            <div className="text-xs text-muted-foreground">{periodLabel}</div>
                                            <div className="font-medium text-foreground">
                                                {formatDate(subscription.trial_ends_at ?? subscription.current_period_end)}
                                                {subscription.days_remaining !== null && <span className="text-muted-foreground"> ({subscription.days_remaining}d)</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Billing currency</div>
                                            <div className="font-medium text-foreground">{currency}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Billing country</div>
                                            <div className="font-medium text-foreground">
                                                {billing.country ?? (
                                                    <Link href={billing.settings_url} className="text-primary hover:underline underline-offset-4">
                                                        Set billing details
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {gateways.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                                            <span className="text-xs text-muted-foreground">Accepted methods ({currency}):</span>
                                            {gateways.map((gateway) => (
                                                <Badge key={gateway.value} tone="neutral">
                                                    {gateway.label}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No subscription on record. Choose a plan below to get started.</p>
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
                                        <span className="text-muted-foreground">{limitLabel(metric)}</span>
                                        <span className={cn('tabular-nums', over ? 'font-medium text-destructive' : 'text-foreground')}>
                                            {value} {limit !== null && limit !== undefined ? `/ ${limit}` : '/ ∞'}
                                        </span>
                                    </div>
                                );
                            })}
                            {Object.keys(usage).length === 0 && <p className="text-xs text-muted-foreground">No usage recorded yet.</p>}
                        </CardBody>
                    </Card>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <KpiCard label="Open invoices" value={unpaid.length} tone={unpaid.length > 0 ? 'warning' : 'neutral'} />
                    <KpiCard
                        label="Outstanding"
                        value={formatMoney(unpaid.reduce((sum, i) => sum + i.outstanding, 0), currency)}
                        tone={unpaid.length > 0 ? 'warning' : 'neutral'}
                    />
                    <KpiCard label="Paid invoices" value={invoices.filter((i) => i.status === 'paid').length} tone="success" />
                </div>

                <Card>
                    <CardHeader
                        title="Change plan"
                        description="Choose a plan. A new invoice is issued at the new price and your plan activates once it is paid. No proration."
                        action={
                            <Tabs
                                tabs={[
                                    { key: 'monthly', label: 'Monthly' },
                                    { key: 'yearly', label: 'Yearly' },
                                ]}
                                value={cycle}
                                onChange={(k) => setCycle(k as 'monthly' | 'yearly')}
                                variant="pills"
                            />
                        }
                    />
                    <CardBody>
                        {plans.length === 0 ? (
                            <EmptyState title="No plans available" description="There are no public plans to switch to right now." />
                        ) : (
                            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {plans.map((plan) => {
                                    const isCurrent = subscription?.plan_id === plan.id;
                                    const isPending = pending_plan?.plan_id === plan.id;
                                    return (
                                        <div
                                            key={plan.id}
                                            className={cn(
                                                'flex flex-col rounded-xl border bg-card p-4 shadow-xs',
                                                isCurrent ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-base font-semibold tracking-tight text-foreground">{plan.name}</h3>
                                                <div className="flex items-center gap-1.5">
                                                    {isCurrent && <Badge tone="info">Current</Badge>}
                                                    {isPending && <Badge tone="warning">Pending</Badge>}
                                                </div>
                                            </div>
                                            {plan.description && <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>}
                                            <div className="mt-3 flex items-end gap-1">
                                                <span className="text-2xl font-bold tracking-tight text-foreground">
                                                    {formatMoney(priceFor(plan), plan.currency)}
                                                </span>
                                                <span className="pb-1 text-sm text-muted-foreground">/ {cycle === 'yearly' ? 'year' : 'month'}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">{plan.trial_days}-day trial</p>

                                            {plan.features.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {plan.features.map((feature) => (
                                                        <span key={feature} className="rounded-md bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                            {feature.replace(/_/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                                {['branches', 'users', 'orders_this_month'].map((key) => (
                                                    <div key={key}>
                                                        <dt className="text-muted-foreground">{limitLabel(key)}</dt>
                                                        <dd className="font-semibold text-foreground">{plan.limits[key] ?? '∞'}</dd>
                                                    </div>
                                                ))}
                                            </dl>

                                            <div className="mt-4 flex-1" />
                                            <Button
                                                size="sm"
                                                variant={isCurrent || isPending ? 'secondary' : 'primary'}
                                                disabled={isCurrent || isPending}
                                                className="w-full"
                                                onClick={() => setPending(plan)}
                                            >
                                                {isCurrent ? 'Current plan' : isPending ? 'Pending activation' : 'Switch to this plan'}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Invoices" description="Download a PDF or pay outstanding invoices online." />
                    <CardBody>
                        <DataTable columns={invoiceColumns} rows={invoices} rowKey={(r) => r.id} sort={sort} empty={<EmptyState title="No invoices yet" />} />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Payment history" description="Payments against your subscription, with retry for failed attempts." />
                    <CardBody>
                        <DataTable columns={paymentColumns} rows={payments} rowKey={(r) => r.id} empty={<EmptyState title="No payments recorded yet" />} />
                    </CardBody>
                </Card>
            </div>

            <ConfirmDialog
                show={pending !== null}
                title={`Switch to ${pending?.name ?? ''}?`}
                description="A new invoice is issued for this plan at the selected cycle's price. Your plan activates once that invoice is paid — there is no proration."
                confirmLabel="Switch plan"
                tone="primary"
                onConfirm={switchPlan}
                onClose={() => setPending(null)}
            >
                <div className="text-sm text-muted-foreground">
                    Billing cycle: <span className="font-medium capitalize text-foreground">{cycle}</span> · {pending ? formatMoney(priceFor(pending), pending.currency) : ''}
                </div>
            </ConfirmDialog>

            <ConfirmDialog
                show={cancelOpen}
                title="Cancel renewal?"
                description="Your subscription will not renew. You keep full access until the end of the current period, then the subscription expires. Restaurant data is preserved."
                confirmLabel="Cancel renewal"
                onConfirm={() => router.post(route('subscription.cancel'), {}, { preserveScroll: true, onFinish: () => setCancelOpen(false) })}
                onClose={() => setCancelOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
