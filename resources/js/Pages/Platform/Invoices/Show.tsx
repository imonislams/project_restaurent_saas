import { Badge, Button, Card, CardBody, CardHeader, Drawer, formatDate, formatMoney } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface InvoiceView {
    id: number;
    number: string;
    tenant: string | null;
    tenant_id: number;
    subtotal: number;
    discount_amount: number;
    coupon_code: string | null;
    amount: number;
    currency: string;
    status: string;
    status_label: string;
    issued_at: string | null;
    due_date: string | null;
    paid_at: string | null;
    sent_at: string | null;
    delivery_status: string | null;
    outstanding: number;
    items: { description: string; quantity: number; unit_price: number; amount: number }[];
    credit_notes: { number: string; amount: number; reason: string; issued_at: string | null }[];
    adjustments: { type: string; amount: number; reason: string; applied_at: string | null }[];
    payments: { id: number; gateway: string; amount: number; currency: string; status: string; status_label: string; provider_ref: string | null; paid_at: string | null; refunded_amount: number }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { paid: 'success', open: 'warning', issued: 'warning', overdue: 'danger', void: 'neutral' };

export default function InvoiceShow({ invoice, gateways }: { invoice: InvoiceView; gateways: { value: string; label: string }[] }) {
    const [drawer, setDrawer] = useState<null | 'credit' | 'adjustment'>(null);
    const credit = useForm({ amount: '', reason: '' });
    const adjustment = useForm({ type: 'credit', amount: '', reason: '' });

    const post = (routeName: string, data: Record<string, unknown> = {}) => router.post(route(routeName, invoice.id), data as any, { preserveScroll: true });

    const submitCredit = (e: FormEvent) => {
        e.preventDefault();
        credit.post(route('platform.billing.invoices.credit-notes', invoice.id), { preserveScroll: true, onSuccess: () => { credit.reset(); setDrawer(null); } });
    };
    const submitAdjustment = (e: FormEvent) => {
        e.preventDefault();
        adjustment.post(route('platform.billing.invoices.adjustments', invoice.id), { preserveScroll: true, onSuccess: () => { adjustment.reset(); setDrawer(null); } });
    };

    return (
        <PlatformLayout title={invoice.number}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900">{invoice.number}</h1>
                        <Badge tone={STATUS_TONE[invoice.status] ?? 'neutral'}>{invoice.status_label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                        {invoice.tenant && (
                            <Link href={route('platform.tenants.show', invoice.tenant_id)} className="text-indigo-600 hover:text-indigo-700">
                                {invoice.tenant}
                            </Link>
                        )}
                        {' · issued '}
                        {formatDate(invoice.issued_at)} · due {formatDate(invoice.due_date)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" href={route('platform.billing.invoices.document', invoice.id)}>
                        Download PDF
                    </Button>
                    <Button size="sm" variant="secondary" loading={false} onClick={() => post('platform.billing.invoices.send')}>
                        Send email
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDrawer('credit')}>
                        Credit note
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDrawer('adjustment')}>
                        Adjustment
                    </Button>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title="Line items" />
                    <CardBody>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Description</th>
                                    <th className="py-2 text-right">Qty</th>
                                    <th className="py-2 text-right">Unit</th>
                                    <th className="py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-2 text-gray-700">{item.description}</td>
                                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                                        <td className="py-2 text-right text-gray-600">{formatMoney(item.unit_price, invoice.currency)}</td>
                                        <td className="py-2 text-right text-gray-700">{formatMoney(item.amount, invoice.currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <dl className="mt-4 ml-auto w-64 space-y-1 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd>{formatMoney(invoice.subtotal, invoice.currency)}</dd></div>
                            {invoice.discount_amount > 0 && (
                                <div className="flex justify-between"><dt className="text-gray-500">Discount {invoice.coupon_code}</dt><dd>-{formatMoney(invoice.discount_amount, invoice.currency)}</dd></div>
                            )}
                            <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold"><dt>Total</dt><dd>{formatMoney(invoice.amount, invoice.currency)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Outstanding</dt><dd>{formatMoney(invoice.outstanding, invoice.currency)}</dd></div>
                        </dl>
                    </CardBody>
                </Card>

                <div className="space-y-5">
                    <Card>
                        <CardHeader title="Pay with a gateway" description={invoice.outstanding > 0 ? 'Opens the provider checkout' : 'Invoice settled'} />
                        <CardBody className="space-y-2">
                            {gateways.length === 0 && <p className="text-sm text-gray-500">No enabled gateway supports {invoice.currency}.</p>}
                            {gateways.map((gateway) => (
                                <Button key={gateway.value} size="sm" variant="secondary" className="w-full" disabled={invoice.outstanding <= 0} onClick={() => post('platform.billing.invoices.checkout', { gateway_id: gateway.value })}>
                                    Pay with {gateway.label}
                                </Button>
                            ))}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Delivery" />
                        <CardBody>
                            <dl className="space-y-1 text-sm">
                                <div className="flex justify-between"><dt className="text-gray-500">Sent</dt><dd>{formatDate(invoice.sent_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd>{invoice.delivery_status ?? '—'}</dd></div>
                            </dl>
                        </CardBody>
                    </Card>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                    <CardHeader title="Payments" />
                    <CardBody className="space-y-2">
                        {invoice.payments.map((payment) => (
                            <Link key={payment.id} href={route('platform.billing.payments.show', payment.id)} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">
                                    {payment.gateway} · {payment.status_label}
                                </span>
                                <span className="text-gray-500">{formatMoney(payment.amount, payment.currency)}</span>
                            </Link>
                        ))}
                        {invoice.payments.length === 0 && <p className="text-sm text-gray-500">No payment attempts.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Credit notes" />
                    <CardBody className="space-y-2">
                        {invoice.credit_notes.map((note, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{note.number} · {note.reason}</span>
                                <span className="text-gray-500">{formatMoney(note.amount, invoice.currency)}</span>
                            </div>
                        ))}
                        {invoice.credit_notes.length === 0 && <p className="text-sm text-gray-500">No credit notes.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Adjustments" />
                    <CardBody className="space-y-2">
                        {invoice.adjustments.map((adj, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{adj.type} · {adj.reason}</span>
                                <span className="text-gray-500">{formatMoney(adj.amount, invoice.currency)}</span>
                            </div>
                        ))}
                        {invoice.adjustments.length === 0 && <p className="text-sm text-gray-500">No adjustments.</p>}
                    </CardBody>
                </Card>
            </div>

            <Drawer show={drawer === 'credit'} onClose={() => setDrawer(null)} title="Issue credit note" footer={<Button size="sm" loading={credit.processing} onClick={submitCredit}>Issue credit note</Button>}>
                <form onSubmit={submitCredit} className="space-y-3">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Amount ({invoice.currency})</span>
                        <input value={credit.data.amount} onChange={(e) => credit.setData('amount', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm" />
                        {credit.errors.amount && <span className="text-xs text-red-600">{credit.errors.amount}</span>}
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Reason</span>
                        <input value={credit.data.reason} onChange={(e) => credit.setData('reason', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm" />
                        {credit.errors.reason && <span className="text-xs text-red-600">{credit.errors.reason}</span>}
                    </label>
                </form>
            </Drawer>

            <Drawer show={drawer === 'adjustment'} onClose={() => setDrawer(null)} title="Record adjustment" footer={<Button size="sm" loading={adjustment.processing} onClick={submitAdjustment}>Record adjustment</Button>}>
                <form onSubmit={submitAdjustment} className="space-y-3">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Type</span>
                        <select value={adjustment.data.type} onChange={(e) => adjustment.setData('type', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm">
                            <option value="credit">Credit (reduce balance)</option>
                            <option value="debit">Debit (increase balance)</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Amount ({invoice.currency})</span>
                        <input value={adjustment.data.amount} onChange={(e) => adjustment.setData('amount', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm" />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-500">Reason</span>
                        <input value={adjustment.data.reason} onChange={(e) => adjustment.setData('reason', e.target.value)} className="block w-full rounded-md border-gray-300 text-sm" />
                    </label>
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
