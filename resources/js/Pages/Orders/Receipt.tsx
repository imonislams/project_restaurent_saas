import { Head, Link, router, usePage } from '@inertiajs/react';

interface ReceiptOrder {
    id: number;
    order_number: string;
    order_type_label: string;
    status: string;
    customer_name: string | null;
    branch_name: string | null;
    cashier_name: string | null;
    currency: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    service_charge: number;
    total: number;
    paid_total: number;
    change_due: number;
    placed_at: string | null;
    items: { name: string; quantity: number; unit_price: number; line_total: number; notes: string | null }[];
    payments: { method: string; amount: number; change_due: number; status: string }[];
}

export default function Receipt({
    order,
    receipt,
}: {
    order: ReceiptOrder;
    receipt: { header: string | null; footer: string | null; show_tax: boolean; show_logo: boolean };
}) {
    const { flash } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <Head title={`Receipt ${order.order_number}`} />

            <div className="mx-auto max-w-sm">
                {flash?.success && (
                    <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 print:hidden">
                        {flash.success}
                    </div>
                )}

                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <div className="text-center">
                        <h1 className="text-lg font-semibold text-gray-900">{receipt.header}</h1>
                        <p className="text-xs text-gray-500">{order.branch_name}</p>
                    </div>

                    <div className="mt-4 border-y border-dashed border-gray-300 py-2 text-xs text-gray-600">
                        <div className="flex justify-between">
                            <span>{order.order_number}</span>
                            <span>{order.order_type_label}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{order.placed_at ? new Date(order.placed_at).toLocaleString() : ''}</span>
                            <span>{order.cashier_name}</span>
                        </div>
                        {order.customer_name && (
                            <div className="flex justify-between">
                                <span>Customer</span>
                                <span>{order.customer_name}</span>
                            </div>
                        )}
                    </div>

                    <table className="mt-3 w-full text-xs">
                        <tbody>
                            {order.items.map((item, i) => (
                                <tr key={i} className="align-top">
                                    <td className="py-1">
                                        {item.quantity} × {item.name}
                                        {item.notes && (
                                            <span className="block text-gray-400">{item.notes}</span>
                                        )}
                                    </td>
                                    <td className="py-1 text-right">{item.line_total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-3 space-y-1 border-t border-dashed border-gray-300 pt-2 text-xs">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{order.subtotal.toFixed(2)}</span>
                        </div>
                        {order.discount_total > 0 && (
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span>−{order.discount_total.toFixed(2)}</span>
                            </div>
                        )}
                        {receipt.show_tax && order.tax_total > 0 && (
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span>{order.tax_total.toFixed(2)}</span>
                            </div>
                        )}
                        {order.service_charge > 0 && (
                            <div className="flex justify-between">
                                <span>Service charge</span>
                                <span>{order.service_charge.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-semibold">
                            <span>Total</span>
                            <span>
                                {order.currency} {order.total.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 space-y-1 border-t border-dashed border-gray-300 pt-2 text-xs text-gray-600">
                        {order.payments.map((p, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{p.method}</span>
                                <span>{p.amount.toFixed(2)}</span>
                            </div>
                        ))}
                        {order.change_due > 0 && (
                            <div className="flex justify-between font-medium">
                                <span>Change</span>
                                <span>{order.change_due.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-center text-xs text-gray-500">{receipt.footer}</p>
                </div>

                <div className="mt-6 flex justify-center gap-3 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        Print receipt
                    </button>
                    <button
                        onClick={() => router.get(route('orders.receipt', order.id), { reprint: 1 })}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Reprint
                    </button>
                    <Link
                        href={route('pos.index')}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        New sale
                    </Link>
                    <Link
                        href={route('orders.index')}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}
