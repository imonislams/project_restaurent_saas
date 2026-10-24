import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    KpiCard,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatDate,
    formatMoney,
} from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

interface CurrencySummary {
    currency: string;
    outstanding: number;
    collected_month: number;
    collected_total: number;
    refunds_total: number;
    credit_notes_total: number;
    adjustments_total: number;
    payments_succeeded: number;
    payments_failed: number;
    payments_pending: number;
}

interface GatewaySummary {
    gateway: string;
    currency: string;
    collected: number;
    payments: number;
}

export default function BillingOverview({
    by_currency,
    by_gateway,
    counts,
    upcoming_renewals,
    recent_invoices,
}: {
    by_currency: CurrencySummary[];
    by_gateway: GatewaySummary[];
    counts: {
        active: number;
        trialing: number;
        past_due: number;
        cancelled: number;
        invoices_total: number;
        payments_total: number;
    };
    upcoming_renewals: { tenant: string | null; plan: string | null; currency: string | null; amount: number | null; renews_at: string | null }[];
    recent_invoices: { id: number; number: string; tenant: string | null; amount: number; currency: string; status_label: string; issued_at: string | null }[];
}) {
    return (
        <PlatformLayout
            title="Billing"
            description="Subscription revenue, subscriptions and invoice health. Amounts are shown per currency and never combined across currencies."
            actions={
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" href={route('platform.billing.invoices.index')}>
                        Invoices
                    </Button>
                    <Button size="sm" variant="outline" href={route('platform.billing.payments.index')}>
                        Payments
                    </Button>
                </div>
            }
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <KpiCard label="Active" value={counts.active} tone="success" hint="Active subscriptions" />
                <KpiCard label="Trialing" value={counts.trialing} hint="In trial" />
                <KpiCard label="Past due" value={counts.past_due} tone={counts.past_due > 0 ? 'warning' : 'neutral'} hint="Past due or in grace" />
                <KpiCard label="Cancelled" value={counts.cancelled} hint="Cancelled or expired" />
                <KpiCard label="Invoices" value={counts.invoices_total} />
                <KpiCard label="Payments" value={counts.payments_total} />
            </div>

            <Card className="mt-6">
                <CardHeader title="Revenue by currency" description="Each currency is reported separately — no cross-currency total is shown." />
                <CardBody className="space-y-4">
                    {by_currency.length === 0 && <p className="text-sm text-muted-foreground">No billing data yet.</p>}
                    {by_currency.map((row) => (
                        <div key={row.currency} className="rounded-lg border border-border p-3.5">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold text-foreground">{row.currency}</span>
                                {row.payments_failed > 0 && <Badge tone="danger">{row.payments_failed} failed</Badge>}
                                {row.payments_pending > 0 && <Badge tone="warning">{row.payments_pending} pending</Badge>}
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                                <div>
                                    <div className="text-xs text-muted-foreground">Collected (month)</div>
                                    <div className="text-sm font-semibold tabular-nums text-emerald-600">{formatMoney(row.collected_month, row.currency)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Collected (total)</div>
                                    <div className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(row.collected_total, row.currency)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Outstanding</div>
                                    <div className={'text-sm font-semibold tabular-nums ' + (row.outstanding > 0 ? 'text-amber-600' : 'text-foreground')}>
                                        {formatMoney(row.outstanding, row.currency)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Refunds</div>
                                    <div className="text-sm tabular-nums text-foreground">{formatMoney(row.refunds_total, row.currency)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Credit notes</div>
                                    <div className="text-sm tabular-nums text-foreground">{formatMoney(row.credit_notes_total, row.currency)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Adjustments</div>
                                    <div className="text-sm tabular-nums text-foreground">{formatMoney(row.adjustments_total, row.currency)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardBody>
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Revenue by gateway" description="Collected payments, reconciled per gateway and currency." />
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Gateway</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead className="text-right">Collected</TableHead>
                                    <TableHead className="text-right">Payments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {by_gateway.map((row, i) => (
                                    <TableRow key={`${row.gateway}-${row.currency}-${i}`}>
                                        <TableCell className="font-medium text-foreground">{row.gateway}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{row.currency}</TableCell>
                                        <TableCell className="text-right tabular-nums font-semibold text-foreground">{formatMoney(row.collected, row.currency)}</TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{row.payments}</TableCell>
                                    </TableRow>
                                ))}
                                {by_gateway.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                                            No successful payments yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Financial Operations" description="Reconciliations and ledgers" />
                    <CardBody className="space-y-1.5 p-3">
                        {[
                            ['Credit Notes', 'platform.billing.credit-notes'],
                            ['Account Adjustments', 'platform.billing.adjustments'],
                            ['Refund Requests', 'platform.billing.refunds'],
                            ['Settlements', 'platform.billing.settlements'],
                            ['Revenue Reports', 'platform.analytics.revenue-reports'],
                        ].map(([label, routeName]) => (
                            <Link
                                key={routeName}
                                href={route(routeName)}
                                className="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                            >
                                <span>{label}</span>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            </Link>
                        ))}
                    </CardBody>
                </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Upcoming renewals" description="Next 30 days where the subscription provides a period end." />
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Renews</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {upcoming_renewals.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-muted-foreground">{row.tenant ?? '—'}</TableCell>
                                        <TableCell className="text-foreground">{row.plan ?? '—'}</TableCell>
                                        <TableCell className="text-right tabular-nums text-foreground">
                                            {row.amount !== null && row.currency ? formatMoney(row.amount, row.currency) : '—'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{formatDate(row.renews_at)}</TableCell>
                                    </TableRow>
                                ))}
                                {upcoming_renewals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                                            No renewals in the next 30 days.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                <Card>
                    <CardHeader
                        title="Recent invoices"
                        action={
                            <Link
                                href={route('platform.billing.invoices.index')}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-4"
                            >
                                <span>View all</span>
                                <ArrowUpRight className="h-3 w-3" />
                            </Link>
                        }
                    />
                    <div className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recent_invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            <Link
                                                href={route('platform.billing.invoices.show', invoice.id)}
                                                className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4"
                                            >
                                                {invoice.number}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{invoice.tenant ?? '—'}</TableCell>
                                        <TableCell className="text-right tabular-nums font-semibold text-foreground">
                                            {formatMoney(invoice.amount, invoice.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-foreground/80">{invoice.status_label}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {recent_invoices.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                                            No invoices issued yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </PlatformLayout>
    );
}
