import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface TicketItem {
    id: number;
    name: string;
    quantity: number;
    status: string;
    station: string | null;
    notes: string | null;
}

interface Ticket {
    id: number;
    status: string;
    priority: string;
    notes: string | null;
    elapsed_minutes: number;
    created_at: string | null;
    order_number: string | null;
    order_type: string | null;
    table_name: string | null;
    customer_name: string | null;
    items: TicketItem[];
}

const COLUMNS = [
    { status: 'new', label: 'New' },
    { status: 'preparing', label: 'Preparing' },
    { status: 'ready', label: 'Ready' },
];

export default function KitchenIndex({
    branches,
    branchId,
    stations,
    selectedStation,
    tickets,
}: {
    branches: { id: number; name: string }[];
    branchId: number | null;
    stations: { id: number; name: string }[];
    selectedStation: number | null;
    tickets: Ticket[];
    ticketStatuses: { value: string; label: string }[];
    itemStatuses: { value: string; label: string }[];
}) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('kitchen.manage');

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(timer);
    }, []);

    const apply = (params: Record<string, unknown>) =>
        router.get(
            route('kitchen.index'),
            { branch_id: branchId, station_id: selectedStation, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const setTicketStatus = (ticket: Ticket, status: string) =>
        router.patch(route('kitchen.tickets.status', ticket.id), { status }, { preserveScroll: true });

    const setItemStatus = (item: TicketItem, status: string) =>
        router.patch(route('kitchen.items.status', item.id), { status }, { preserveScroll: true });

    const togglePriority = (ticket: Ticket) =>
        router.patch(
            route('kitchen.tickets.priority', ticket.id),
            { priority: ticket.priority === 'urgent' ? 'normal' : 'urgent' },
            { preserveScroll: true },
        );

    const elapsed = (ticket: Ticket) => {
        const minutes = ticket.created_at
            ? Math.max(0, Math.floor((now - new Date(ticket.created_at).getTime()) / 60000))
            : ticket.elapsed_minutes;
        return minutes;
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Head title="Kitchen Display" />

            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">Kitchen Display</span>
                    <select
                        className="rounded-md border-gray-300 py-1 text-sm"
                        value={branchId ?? ''}
                        onChange={(e) => apply({ branch_id: e.target.value })}
                    >
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                    <select
                        className="rounded-md border-gray-300 py-1 text-sm"
                        value={selectedStation ?? ''}
                        onChange={(e) => apply({ station_id: e.target.value || null })}
                    >
                        <option value="">All stations</option>
                        {stations.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
                <Link href={route('pos.index')} className="text-sm text-gray-600 hover:text-gray-800">
                    Back to POS
                </Link>
            </header>

            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
                {COLUMNS.map((column) => {
                    const columnTickets = tickets.filter((t) => t.status === column.status);

                    return (
                        <div key={column.status} className="rounded-lg bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                                <h2 className="text-sm font-semibold text-gray-700">{column.label}</h2>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                    {columnTickets.length}
                                </span>
                            </div>

                            <div className="space-y-3 p-3">
                                {columnTickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className={
                                            'rounded-lg border p-3 ' +
                                            (ticket.priority === 'urgent'
                                                ? 'border-red-300 bg-red-50'
                                                : 'border-gray-200')
                                        }
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-800">
                                                    {ticket.order_number}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {ticket.table_name ?? ticket.customer_name ?? ticket.order_type}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div
                                                    className={
                                                        'text-sm font-semibold ' +
                                                        (elapsed(ticket) >= 15 ? 'text-red-600' : 'text-gray-600')
                                                    }
                                                >
                                                    {elapsed(ticket)}m
                                                </div>
                                                {canManage && (
                                                    <button
                                                        onClick={() => togglePriority(ticket)}
                                                        className="text-xs text-gray-400 hover:text-gray-600"
                                                    >
                                                        {ticket.priority === 'urgent' ? 'Urgent ★' : 'Urgent ☆'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <ul className="mt-2 space-y-1">
                                            {ticket.items.map((item) => (
                                                <li key={item.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-700">
                                                        {item.quantity} × {item.name}
                                                        {item.station && (
                                                            <span className="ml-1 text-xs text-gray-400">
                                                                ({item.station})
                                                            </span>
                                                        )}
                                                    </span>
                                                    {canManage && (
                                                        <span className="flex gap-1">
                                                            {['preparing', 'ready', 'served'].map((s) => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => setItemStatus(item, s)}
                                                                    className={
                                                                        'rounded px-1.5 py-0.5 text-xs ' +
                                                                        (item.status === s
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                                                                    }
                                                                >
                                                                    {s[0].toUpperCase()}
                                                                </button>
                                                            ))}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>

                                        {ticket.notes && (
                                            <p className="mt-2 text-xs text-amber-700">Note: {ticket.notes}</p>
                                        )}

                                        <div className="mt-3 flex items-center gap-2">
                                            {canManage && column.status === 'new' && (
                                                <button
                                                    onClick={() => setTicketStatus(ticket, 'preparing')}
                                                    className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white"
                                                >
                                                    Accept
                                                </button>
                                            )}
                                            {canManage && column.status === 'preparing' && (
                                                <button
                                                    onClick={() => setTicketStatus(ticket, 'ready')}
                                                    className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white"
                                                >
                                                    Mark ready
                                                </button>
                                            )}
                                            {canManage && column.status === 'ready' && (
                                                <button
                                                    onClick={() => setTicketStatus(ticket, 'served')}
                                                    className="rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white"
                                                >
                                                    Served
                                                </button>
                                            )}
                                            <Link
                                                href={route('kitchen.tickets.print', ticket.id)}
                                                target="_blank"
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Print
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {columnTickets.length === 0 && (
                                    <p className="py-6 text-center text-sm text-gray-400">No tickets</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
