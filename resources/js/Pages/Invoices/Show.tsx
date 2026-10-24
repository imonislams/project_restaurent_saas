import { Badge, Button, Card, CardBody, CardHeader, PageHeader } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface InvoiceOrder {
    id: number;
    order_number: string;
    status: string;
    fulfillment_status: string;
    table_name: string | null;
    total: number;
    paid_total: number;
    amount: number;
    placed_at: string | null;
    items: { name: string; quantity: number; line_total: number }[];
}

interface InvoiceDetail {
    id: number;
    number: string;
    status: string;
    status_label: string;
    table_name: string | null;
    branch_name: string | null;
    customer_name: string | null;
    currency: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    service_charge: number;
    total: number;
    paid_total: number;
    outstanding: number;
    issued_at: string | null;
    paid_at: string | null;
    orders: InvoiceOrder[];
}

const STATUS_TONES: Record<string, BadgeTone> = {
    open: 'info',
    draft: 'neutral',
    partially_paid: 'warning',
    paid: 'success',
    void: 'danger',
};

export default function InvoiceShow({ invoice }: { invoice: InvoiceDetail }) {
    const money = (n: number) => `${invoice.currency} ${Number(n || 0).toFixed(2)}`;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title={`Invoice ${invoice.number}`}
                    description={[invoice.table_name, invoice.branch_name].filter(Boolean).join(' · ') || undefined}
                    actions={
                        <div className="flex items-center gap-2">
                            <Badge tone={STATUS_TONES[invoice.status] ?? 'neutral'}>{invoice.status_label}</Badge>
                            <Link href={route('invoices.index')}>
                                <Button size="sm" variant="secondary">Back</Button>
                            </Link>
                        </div>
                    }
                />
            }
        >
            <Head title={`Invoice ${invoice.number}`} />

            <div className="py-6">
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
                    <div className="space-y-6 lg:col-span-2">
                        {invoice.orders.map((order) => (
                            <Card key={order.id}>
                                <CardHeader
                                    title={`Order ${order.order_number}`}
                                    description={[order.table_name, order.placed_at ? new Date(order.placed_at).toLocaleString() : null].filter(Boolean).join(' · ')}
                                    action={
                                        <div className="flex items-center gap-2">
                                            <Badge tone="neutral">{order.fulfillment_status}</Badge>
                                            <Link href={route('orders.show', order.id)}>
                                                <Button size="xs" variant="secondary">View order</Button>
                                            </Link>
                                        </div>
                                    }
                                />
                                <CardBody>
                                    <ul className="divide-y divide-gray-100">
                                        {order.items.map((item, index) => (
                                            <li key={index} className="flex items-center justify-between py-2 text-sm">
                                                <span className="text-gray-700">
                                                    <span className="font-mono text-gray-500">{item.quantity}×</span> {item.name}
                                                </span>
                                                <span className="font-mono tabular-nums text-gray-900">{money(item.line_total)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-semibold">
                                        <span className="text-gray-600">Order total</span>
                                        <span className="font-mono tabular-nums text-gray-900">{money(order.total)}</span>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader title="Totals" />
                            <CardBody className="space-y-2 text-sm">
                                <Row label="Subtotal" value={money(invoice.subtotal)} />
                                {invoice.discount_total > 0 && <Row label="Discount" value={`- ${money(invoice.discount_total)}`} />}
                                {invoice.service_charge > 0 && <Row label="Service charge" value={money(invoice.service_charge)} />}
                                {invoice.tax_total > 0 && <Row label="Tax" value={money(invoice.tax_total)} />}
                                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-bold">
                                    <span>Total</span>
                                    <span className="font-mono tabular-nums">{money(invoice.total)}</span>
                                </div>
                                <Row label="Paid" value={money(invoice.paid_total)} />
                                <div className="flex items-center justify-between text-base font-bold text-rose-700">
                                    <span>Outstanding</span>
                                    <span className="font-mono tabular-nums">{money(invoice.outstanding)}</span>
                                </div>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader title="Details" />
                            <CardBody className="space-y-2 text-sm text-gray-600">
                                <Row label="Customer" value={invoice.customer_name ?? '—'} />
                                <Row label="Branch" value={invoice.branch_name ?? '—'} />
                                <Row label="Table" value={invoice.table_name ?? '—'} />
                                <Row label="Issued" value={invoice.issued_at ? new Date(invoice.issued_at).toLocaleString() : '—'} />
                                <Row label="Paid at" value={invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : '—'} />
                                <Row label="Orders" value={String(invoice.orders.length)} />
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-900">{value}</span>
        </div>
    );
}
