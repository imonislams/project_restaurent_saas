import { Head } from '@inertiajs/react';

interface TicketView {
    id: number;
    order_number: string | null;
    order_type: string | null;
    table_name: string | null;
    priority: string;
    notes: string | null;
    created_at: string | null;
    items: { name: string; quantity: number; station: string | null; notes: string | null }[];
}

export default function KitchenTicket({ ticket }: { ticket: TicketView }) {
    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0">
            <Head title={`Kitchen Ticket · ${ticket.order_number}`} />

            <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-card print:shadow-none print:p-0 font-mono text-sm text-gray-900 border border-gray-200 print:border-none">
                {/* Ticket Header */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-3">
                    <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Kitchen Order Ticket</span>
                    <h1 className="mt-1 text-2xl font-black tracking-tight">{ticket.order_number}</h1>
                    <div className="mt-1 flex items-center justify-center gap-2 font-bold">
                        {ticket.table_name ? (
                            <span className="rounded bg-black text-white px-2 py-0.5 text-xs uppercase">
                                TABLE {ticket.table_name}
                            </span>
                        ) : (
                            <span className="rounded bg-gray-200 text-gray-800 px-2 py-0.5 text-xs uppercase">
                                {ticket.order_type}
                            </span>
                        )}
                    </div>
                    {ticket.priority === 'urgent' && (
                        <div className="mt-2 font-black text-red-600 bg-red-50 border border-red-200 rounded py-0.5 text-xs animate-pulse">
                            *** PRIORITY: URGENT ***
                        </div>
                    )}
                </div>

                {/* Items List */}
                <div className="my-4 divide-y divide-dashed divide-gray-200">
                    {ticket.items.map((item, i) => (
                        <div key={i} className="py-2 first:pt-0 last:pb-0">
                            <div className="flex justify-between items-start font-bold">
                                <span className="text-base text-gray-950">
                                    <span className="text-lg font-black mr-2">{item.quantity}×</span>
                                    {item.name}
                                </span>
                                {item.station && (
                                    <span className="text-[11px] text-gray-500 font-normal shrink-0 ml-2">
                                        [{item.station}]
                                    </span>
                                )}
                            </div>

                            {/* Item Modifier / Special Preparation Notes */}
                            {item.notes && (
                                <div className="mt-1 pl-6 text-xs font-bold text-gray-800 italic">
                                    &gt;&gt; {item.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Order Level Instructions */}
                {ticket.notes && (
                    <div className="my-3 border-t-2 border-dashed border-gray-300 pt-2 text-xs font-bold bg-amber-50 p-2 rounded border border-amber-200">
                        <span>ORDER NOTE: </span>
                        <span className="font-normal">{ticket.notes}</span>
                    </div>
                )}

                {/* Timestamp & Footer */}
                <div className="border-t-2 border-dashed border-gray-300 pt-3 text-center text-xs text-gray-500">
                    <div>Placed: {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString() : 'Just now'}</div>
                    <div>Printed: {new Date().toLocaleTimeString()}</div>
                </div>

                {/* Print Control Buttons (Hidden when printing) */}
                <div className="mt-6 flex gap-2 justify-center print:hidden border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={() => window.close()}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
                    >
                        Print Ticket 🖨
                    </button>
                </div>
            </div>
        </div>
    );
}
