import {
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
import { ArrowUpRight, ChevronRight, FileText, Receipt, Wallet } from 'lucide-react';

export default function BillingOverview({
    summary,
    recent_invoices,
}: {
    summary: {
        outstanding: number;
        collected_month: number;
        collected_total: number;
        invoices_total: number;
        credit_notes_total: number;
        adjustments_total: number;
        refunds_total: number;
        payments_total: number;
        payments_failed: number;
        payments_pending: number;
    };
    recent_invoices: { id: number; number: string; tenant: string | null; amount: number; currency: string; status_label: string; issued_at: string | null }[];
}) {
    return (
        <PlatformLayout
            title="Financial Billing"
            description="A financial snapshot of the platform. Track collected revenue, outstanding balances, invoices, and payments."
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                    label="Outstanding"
                    value={formatMoney(summary.outstanding)}
                    tone={summary.outstanding > 0 ? 'warning' : 'neutral'}
                    hint="Open, overdue & partial"
                />
                <KpiCard
                    label="Collected (Month)"
                    value={formatMoney(summary.collected_month)}
                    tone="success"
                />
                <KpiCard
                    label="Collected (Total)"
                    value={formatMoney(summary.collected_total)}
                />
                <KpiCard
                    label="Total Invoices"
                    value={summary.invoices_total}
                />
                <KpiCard
                    label="Total Payments"
                    value={summary.payments_total}
                    hint={`${summary.payments_pending} pending · ${summary.payments_failed} failed`}
                    tone={summary.payments_failed > 0 ? 'warning' : 'neutral'}
                />
                <KpiCard
                    label="Credit Notes"
                    value={formatMoney(summary.credit_notes_total)}
                />
                <KpiCard
                    label="Adjustments"
                    value={formatMoney(summary.adjustments_total)}
                />
                <KpiCard
                    label="Refunds"
                    value={formatMoney(summary.refunds_total)}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title="Recent Invoices"
                        description="Latest billing statements issued to tenants"
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
                                    <TableHead>Issued</TableHead>
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
                                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-foreground/80">
                                                {invoice.status_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {formatDate(invoice.issued_at)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {recent_invoices.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                                            No invoices issued yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Financial Operations" description="Manage reconciliations and ledgers" />
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
        </PlatformLayout>
    );
}
