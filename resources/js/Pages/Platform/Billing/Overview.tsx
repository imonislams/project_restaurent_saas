import { Button, Card, CardBody, CardHeader, KpiCard, formatDate, formatMoney } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link } from '@inertiajs/react';

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
            title="Billing"
            description="A financial snapshot of the platform. Amounts are shown in their issued currency and are not summed across currencies."
            actions={
                <>
                    <Button size="sm" variant="secondary" href={route('platform.billing.invoices.index')}>Invoices</Button>
                    <Button size="sm" variant="secondary" href={route('platform.billing.payments.index')}>Payments</Button>
                </>
            }
        >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard label="Outstanding" value={formatMoney(summary.outstanding)} tone={summary.outstanding > 0 ? 'warning' : 'neutral'} hint="Issued, open, overdue, partial" />
                <KpiCard label="Collected (month)" value={formatMoney(summary.collected_month)} tone="success" />
                <KpiCard label="Collected (all time)" value={formatMoney(summary.collected_total)} />
                <KpiCard label="Invoices" value={summary.invoices_total} />
                <KpiCard label="Payments" value={summary.payments_total} hint={`${summary.payments_pending} pending · ${summary.payments_failed} failed`} tone={summary.payments_failed > 0 ? 'warning' : 'neutral'} />
                <KpiCard label="Credit notes" value={formatMoney(summary.credit_notes_total)} />
                <KpiCard label="Adjustments" value={formatMoney(summary.adjustments_total)} />
                <KpiCard label="Refunds" value={formatMoney(summary.refunds_total)} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Recent invoices" action={<Link href={route('platform.billing.invoices.index')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all</Link>} />
                    <CardBody>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 bg-gray-50/60 text-[11px] uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Invoice</th>
                                    <th className="px-3 py-2">Tenant</th>
                                    <th className="px-3 py-2 text-right">Amount</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Issued</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recent_invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50/70">
                                        <td className="px-3 py-2.5">
                                            <Link href={route('platform.billing.invoices.show', invoice.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                                                {invoice.number}
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600">{invoice.tenant ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{formatMoney(invoice.amount, invoice.currency)}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{invoice.status_label}</td>
                                        <td className="px-3 py-2.5 text-gray-500">{formatDate(invoice.issued_at)}</td>
                                    </tr>
                                ))}
                                {recent_invoices.length === 0 && (
                                    <tr><td colSpan={5} className="py-6 text-center text-gray-500">No invoices yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Shortcuts" />
                    <CardBody className="space-y-2 text-sm">
                        {[
                            ['Credit notes', 'platform.billing.credit-notes'],
                            ['Adjustments', 'platform.billing.adjustments'],
                            ['Refunds', 'platform.billing.refunds'],
                            ['Settlements', 'platform.billing.settlements'],
                            ['Revenue reports', 'platform.analytics.revenue-reports'],
                        ].map(([label, routeName]) => (
                            <Link key={routeName} href={route(routeName)} className="block rounded-lg px-3 py-2 text-gray-700 transition hover:bg-gray-50 hover:text-gray-900">
                                {label}
                            </Link>
                        ))}
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
