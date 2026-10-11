import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface OpenOrder {
    id: number;
    order_number: string;
    total: number;
}

interface TableRow {
    id: number;
    name: string;
    seats: number;
    status: string;
    dining_area: string | null;
    open_orders: OpenOrder[];
}

const STATUS_STYLES: Record<string, string> = {
    available: 'border-green-300 bg-green-50',
    occupied: 'border-red-300 bg-red-50',
    reserved: 'border-amber-300 bg-amber-50',
    billing: 'border-indigo-300 bg-indigo-50',
    cleaning: 'border-gray-300 bg-gray-50',
};

export default function TablesIndex({
    branches,
    branchId,
    areas,
    tables,
    statuses,
}: {
    branches: { id: number; name: string }[];
    branchId: number | null;
    areas: { id: number; name: string }[];
    tables: TableRow[];
    statuses: { value: string; label: string }[];
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('tables.manage');

    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<TableRow | null>(null);
    const [transferOrder, setTransferOrder] = useState<number | ''>('');

    const form = useForm({
        branch_id: branchId ?? ('' as number | ''),
        name: '',
        seats: 4,
        dining_area_id: '' as number | '',
        is_active: true,
    });

    const submit = () => {
        form.post(route('tables.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('name');
                setShowForm(false);
            },
        });
    };

    const setStatus = (table: TableRow, status: string) => {
        router.patch(route('tables.status', table.id), { status }, { preserveScroll: true });
        setSelected(null);
    };

    const transfer = (table: TableRow) => {
        if (!transferOrder) return;
        router.post(
            route('tables.transfer'),
            { order_id: transferOrder, table_id: table.id },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTransferOrder('');
                    setSelected(null);
                },
            },
        );
    };

    const remove = (table: TableRow) => {
        if (confirm(`Remove table ${table.name}?`)) {
            router.delete(route('tables.destroy', table.id), { preserveScroll: true });
            setSelected(null);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Tables &amp; floor</h2>
                    <div className="flex gap-2">
                        <select
                            className="rounded-md border-gray-300 py-1.5 text-sm"
                            value={branchId ?? ''}
                            onChange={(e) =>
                                router.get(route('tables.index'), { branch_id: e.target.value }, { preserveScroll: true })
                            }
                        >
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                        {canManage && (
                            <button
                                onClick={() => setShowForm((v) => !v)}
                                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                {showForm ? 'Close' : 'Add table'}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Tables" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>
                    )}

                    {showForm && canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New table</h3>
                            <div className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Name</label>
                                    <input
                                        className="block rounded-md border-gray-300 text-sm"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Seats</label>
                                    <input
                                        type="number"
                                        className="block w-24 rounded-md border-gray-300 text-sm"
                                        value={form.data.seats}
                                        onChange={(e) => form.setData('seats', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Area</label>
                                    <select
                                        className="block rounded-md border-gray-300 text-sm"
                                        value={form.data.dining_area_id}
                                        onChange={(e) =>
                                            form.setData('dining_area_id', e.target.value ? Number(e.target.value) : '')
                                        }
                                    >
                                        <option value="">None</option>
                                        {areas.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={submit}
                                    disabled={form.processing}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Create table
                                </button>
                                {form.errors.name && <p className="text-sm text-red-600">{form.errors.name}</p>}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {tables.map((table) => (
                            <button
                                key={table.id}
                                onClick={() => setSelected(table)}
                                className={
                                    'rounded-lg border-2 p-4 text-left transition hover:shadow-md ' +
                                    (STATUS_STYLES[table.status] ?? 'border-gray-200 bg-white')
                                }
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-semibold text-gray-800">{table.name}</span>
                                    <span className="text-xs text-gray-500">{table.seats} seats</span>
                                </div>
                                <div className="mt-1 text-xs capitalize text-gray-600">{table.status}</div>
                                {table.open_orders.length > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">
                                        {table.open_orders.length} open order(s)
                                    </div>
                                )}
                                {table.dining_area && (
                                    <div className="mt-1 text-xs text-gray-400">{table.dining_area}</div>
                                )}
                            </button>
                        ))}
                        {tables.length === 0 && (
                            <p className="col-span-full py-10 text-center text-sm text-gray-500">
                                No tables yet. Add your first table to start floor management.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {selected && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900">
                            Table {selected.name} · <span className="capitalize">{selected.status}</span>
                        </h3>

                        {selected.open_orders.length > 0 && (
                            <div className="mt-3 rounded-md border border-gray-100 p-3 text-sm">
                                <p className="mb-2 font-medium text-gray-700">Open orders</p>
                                <ul className="space-y-1">
                                    {selected.open_orders.map((o) => (
                                        <li key={o.id} className="flex justify-between text-gray-600">
                                            <button
                                                className="text-indigo-600 hover:text-indigo-700"
                                                onClick={() => router.get(route('orders.show', o.id))}
                                            >
                                                {o.order_number}
                                            </button>
                                            <span>{o.total.toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {canManage && (
                            <>
                                <div className="mt-4">
                                    <p className="mb-1 text-sm font-medium text-gray-700">Set status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {statuses.map((s) => (
                                            <button
                                                key={s.value}
                                                onClick={() => setStatus(selected, s.value)}
                                                className={
                                                    'rounded-md px-3 py-1.5 text-sm ' +
                                                    (selected.status === s.value
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                                                }
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selected.open_orders.length > 0 && (
                                    <div className="mt-4">
                                        <p className="mb-1 text-sm font-medium text-gray-700">Move an order to this table</p>
                                        <select
                                            className="w-full rounded-md border-gray-300 text-sm"
                                            value={transferOrder}
                                            onChange={(e) => setTransferOrder(Number(e.target.value))}
                                        >
                                            <option value="">Select order…</option>
                                            {tables
                                                .flatMap((t) => t.open_orders)
                                                .filter((o) => o.id !== selected.open_orders[0]?.id)
                                                .map((o) => (
                                                    <option key={o.id} value={o.id}>
                                                        {o.order_number}
                                                    </option>
                                                ))}
                                        </select>
                                        <button
                                            onClick={() => transfer(selected)}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
                                        >
                                            Move order here
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => remove(selected)}
                                    className="mt-4 text-sm text-red-600 hover:text-red-700"
                                >
                                    Remove table
                                </button>
                            </>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setSelected(null);
                                    setTransferOrder('');
                                }}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
