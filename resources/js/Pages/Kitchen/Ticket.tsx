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
        <div className="min-h-screen bg-white p-6">
            <Head title={`Kitchen ticket ${ticket.order_number}`} />

            <div className="mx-auto max-w-sm font-mono text-sm">
                <div className="text-center">
                    <h1 className="text-lg font-bold">KITCHEN TICKET</h1>
                    <p>{ticket.order_number}</p>
                    <p className="text-xs text-gray-500">
                        {ticket.table_name ? `Table ${ticket.table_name}` : ticket.order_type}
                    </p>
                    {ticket.priority === 'urgent' && (
                        <p className="mt-1 font-bold text-red-600">*** URGENT ***</p>
                    )}
                </div>

                <div className="my-3 border-y border-dashed border-gray-400 py-2">
                    {ticket.items.map((item, i) => (
                        <div key={i} className="flex justify-between py-0.5">
                            <span>
                                {item.quantity} × {item.name}
                                {item.station && <span className="text-xs text-gray-500"> [{item.station}]</span>}
                            </span>
                        </div>
                    ))}
                </div>

                {ticket.notes && <p className="text-xs">Note: {ticket.notes}</p>}
                <p className="mt-2 text-xs text-gray-500">
                    Printed {new Date().toLocaleString()}
                </p>

                <div className="mt-6 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                    >
                        Print
                    </button>
                </div>
            </div>
        </div>
    );
}
