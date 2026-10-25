import { Badge, Button, Card, CardBody, CardHeader, Drawer, formatDate, formatMoney } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/Table';
import { Input } from '@/Components/ui/Input';
import { Label } from '@/Components/ui/Label';
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
                            <Link href={route('platform.tenants.show', invoice.tenant_id)} className="text-primary hover:text-primary/80">
                                {invoice.tenant}
                            </Link>
                        )}
                        {' · issued '}
                        {formatDate(invoice.issued_at)} · due {formatDate(invoice.due_date)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" external href={route('platform.billing.invoices.document', invoice.id)}>
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
                    <CardBody className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.items.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium text-foreground">{item.description}</TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{item.quantity}</TableCell>
                                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(item.unit_price, invoice.currency)}</TableCell>
                                        <TableCell className="text-right tabular-nums font-semibold text-foreground">{formatMoney(item.amount, invoice.currency)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="p-4 border-t border-border/50">
                            <dl className="ml-auto w-64 space-y-1.5 text-sm">
                                <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="tabular-nums font-medium text-foreground">{formatMoney(invoice.subtotal, invoice.currency)}</dd></div>
                                {invoice.discount_amount > 0 && (
                                    <div className="flex justify-between text-muted-foreground"><dt>Discount {invoice.coupon_code}</dt><dd className="tabular-nums font-medium text-destructive">-{formatMoney(invoice.discount_amount, invoice.currency)}</dd></div>
                                )}
                                <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground"><dt>Total</dt><dd className="tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</dd></div>
                                <div className="flex justify-between text-muted-foreground"><dt>Outstanding</dt><dd className="tabular-nums font-medium text-foreground">{formatMoney(invoice.outstanding, invoice.currency)}</dd></div>
                            </dl>
                        </div>
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
                <form onSubmit={submitCredit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="credit-amount" className="text-xs font-medium text-muted-foreground">Amount ({invoice.currency})</Label>
                        <Input 
                            id="credit-amount"
                            value={credit.data.amount} 
                            onChange={(e) => credit.setData('amount', e.target.value)} 
                        />
                        {credit.errors.amount && <span className="text-xs text-destructive">{credit.errors.amount}</span>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="credit-reason" className="text-xs font-medium text-muted-foreground">Reason</Label>
                        <Input 
                            id="credit-reason"
                            value={credit.data.reason} 
                            onChange={(e) => credit.setData('reason', e.target.value)} 
                        />
                        {credit.errors.reason && <span className="text-xs text-destructive">{credit.errors.reason}</span>}
                    </div>
                </form>
            </Drawer>

            <Drawer show={drawer === 'adjustment'} onClose={() => setDrawer(null)} title="Record adjustment" footer={<Button size="sm" loading={adjustment.processing} onClick={submitAdjustment}>Record adjustment</Button>}>
                <form onSubmit={submitAdjustment} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="adj-type" className="text-xs font-medium text-muted-foreground">Type</Label>
                        <select 
                            id="adj-type"
                            value={adjustment.data.type} 
                            onChange={(e) => adjustment.setData('type', e.target.value)} 
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="credit">Credit (reduce balance)</option>
                            <option value="debit">Debit (increase balance)</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="adj-amount" className="text-xs font-medium text-muted-foreground">Amount ({invoice.currency})</Label>
                        <Input 
                            id="adj-amount"
                            value={adjustment.data.amount} 
                            onChange={(e) => adjustment.setData('amount', e.target.value)} 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="adj-reason" className="text-xs font-medium text-muted-foreground">Reason</Label>
                        <Input 
                            id="adj-reason"
                            value={adjustment.data.reason} 
                            onChange={(e) => adjustment.setData('reason', e.target.value)} 
                        />
                    </div>
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
