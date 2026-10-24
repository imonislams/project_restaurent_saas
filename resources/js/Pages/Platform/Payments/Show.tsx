import { Badge, Button, Card, CardBody, CardHeader, Drawer, formatDate, formatMoney } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { Input } from '@/Components/ui/Input';
import { Label } from '@/Components/ui/Label';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface PaymentView {
    id: number;
    tenant: string | null;
    tenant_id: number;
    invoice: string | null;
    invoice_id: number | null;
    gateway: string;
    provider_ref: string | null;
    amount: number;
    currency: string;
    status: string;
    status_label: string;
    failure_reason: string | null;
    settlement_status: string;
    refunded_amount: number;
    refundable: number;
    paid_at: string | null;
    attempts: { status: string; reference: string | null; created_at: string | null }[];
    refunds: { amount: number; reason: string; status: string; gateway_ref: string | null; processed_at: string | null }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { succeeded: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral', partially_refunded: 'warning' };

export default function PaymentShow({ payment }: { payment: PaymentView }) {
    const [open, setOpen] = useState(false);
    const refund = useForm({ amount: '', reason: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        refund.post(route('platform.billing.payments.refund', payment.id), { preserveScroll: true, onSuccess: () => { refund.reset(); setOpen(false); } });
    };

    return (
        <PlatformLayout title={payment.provider_ref ?? `Payment #${payment.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold text-gray-900">{payment.provider_ref ?? `#${payment.id}`}</h1>
                        <Badge tone={STATUS_TONE[payment.status] ?? 'neutral'}>{payment.status_label}</Badge>
                        <Badge tone="neutral">{payment.gateway}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                        {payment.tenant && (
                            <Link href={route('platform.tenants.show', payment.tenant_id)} className="text-primary hover:text-primary/80">
                                {payment.tenant}
                            </Link>
                        )}
                        {payment.invoice && (
                            <>
                                {' · '}
                                <Link href={route('platform.billing.invoices.show', payment.invoice_id as number)} className="text-primary hover:text-primary/80">
                                    {payment.invoice}
                                </Link>
                            </>
                        )}
                        {' · paid '}
                        {formatDate(payment.paid_at)}
                    </p>
                </div>
                <div className="flex gap-2">
                    {payment.status !== 'succeeded' && payment.status !== 'refunded' && (
                        <Button size="sm" variant="success" onClick={() => router.post(route('platform.billing.payments.settle', payment.id), {}, { preserveScroll: true })}>
                            Mark settled
                        </Button>
                    )}
                    <Button size="sm" variant="danger" disabled={payment.status !== 'succeeded'} onClick={() => setOpen(true)}>
                        Refund
                    </Button>
                </div>
            </div>

            {payment.failure_reason && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{payment.failure_reason}</div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card>
                    <CardHeader title="Summary" />
                    <CardBody>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd>{formatMoney(payment.amount, payment.currency)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Refunded</dt><dd>{formatMoney(payment.refunded_amount, payment.currency)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Refundable</dt><dd>{formatMoney(payment.refundable, payment.currency)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Settlement</dt><dd>{payment.settlement_status}</dd></div>
                        </dl>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Attempts" />
                    <CardBody className="space-y-2">
                        {payment.attempts.map((attempt, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{attempt.status}</span>
                                <span className="text-xs text-gray-400">{formatDate(attempt.created_at)}</span>
                            </div>
                        ))}
                        {payment.attempts.length === 0 && <p className="text-sm text-gray-500">No attempts recorded.</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Refunds" />
                    <CardBody className="space-y-2">
                        {payment.refunds.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{r.reason} · {r.status}</span>
                                <span className="text-gray-500">{formatMoney(r.amount, payment.currency)}</span>
                            </div>
                        ))}
                        {payment.refunds.length === 0 && <p className="text-sm text-gray-500">No refunds.</p>}
                    </CardBody>
                </Card>
            </div>

            <Drawer show={open} onClose={() => setOpen(false)} title="Issue refund" footer={<Button size="sm" variant="danger" loading={refund.processing} onClick={submit}>Refund</Button>}>
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-xs text-muted-foreground">Refundable balance: <span className="font-semibold text-foreground">{formatMoney(payment.refundable, payment.currency)}</span></p>
                    <div className="space-y-1.5">
                        <Label htmlFor="refund-amount" className="text-xs font-medium text-muted-foreground">Amount ({payment.currency})</Label>
                        <Input 
                            id="refund-amount"
                            value={refund.data.amount} 
                            onChange={(e) => refund.setData('amount', e.target.value)} 
                        />
                        {refund.errors.amount && <span className="text-xs text-destructive">{refund.errors.amount}</span>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="refund-reason" className="text-xs font-medium text-muted-foreground">Reason</Label>
                        <Input 
                            id="refund-reason"
                            value={refund.data.reason} 
                            onChange={(e) => refund.setData('reason', e.target.value)} 
                        />
                        {refund.errors.reason && <span className="text-xs text-destructive">{refund.errors.reason}</span>}
                    </div>
                </form>
            </Drawer>
        </PlatformLayout>
    );
}
