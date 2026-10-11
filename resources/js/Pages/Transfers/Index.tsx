import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface TransferRow {
    id: number;
    number: string;
    from_branch: string | null;
    to_branch: string | null;
    status: string;
    status_label: string;
    items_count: number;
    notes: string | null;
    can_approve: boolean;
    can_dispatch: boolean;
    can_receive: boolean;
    can_cancel: boolean;
}

export default function TransfersIndex({
    branches,
    items,
    transfers,
}: {
    branches: { id: number; name: string }[];
    items: { value: string; label: string; type: string; id: number; cost: number }[];
    transfers: TransferRow[];
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('inventory.manage');
    const canApprove = auth.permissions.includes('inventory.approve');

    const form = useForm({
        from_branch_id: branches[0]?.id ?? ('' as number | ''),
        to_branch_id: branches[1]?.id ?? branches[0]?.id ?? ('' as number | ''),
        item: items[0]?.value ?? '',
        quantity: 1,
        notes: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const [item_type, item_id] = form.data.item.split(':');
        form.transform((data) => ({
            from_branch_id: data.from_branch_id,
            to_branch_id: data.to_branch_id,
            notes: data.notes,
            items: [{ item_type, item_id: Number(item_id), quantity: data.quantity }],
        }));
        form.post(route('transfers.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('quantity', 'notes'),
        });
    };

    const statusColor = (status: string) =>
        status === 'received'
            ? 'bg-green-100 text-green-800'
            : status === 'dispatched'
              ? 'bg-indigo-100 text-indigo-800'
              : status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-200 text-gray-700';

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Stock transfers</h2>}
        >
            <Head title="Transfers" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    {canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New transfer</h3>
                            <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">From</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={form.data.from_branch_id} onChange={(e) => form.setData('from_branch_id', Number(e.target.value))}>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">To</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={form.data.to_branch_id} onChange={(e) => form.setData('to_branch_id', Number(e.target.value))}>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Item</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={form.data.item} onChange={(e) => form.setData('item', e.target.value)}>
                                        {items.map((i) => (
                                            <option key={i.value} value={i.value}>{i.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Quantity</label>
                                    <input type="number" step="0.001" className="block w-28 rounded-md border-gray-300 text-sm" value={form.data.quantity} onChange={(e) => form.setData('quantity', Number(e.target.value))} />
                                </div>
                                <button type="submit" disabled={form.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                    Create transfer
                                </button>
                                {Object.values(form.errors)[0] && <p className="text-sm text-red-600">{Object.values(form.errors)[0]}</p>}
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Transfers</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Number</th>
                                    <th className="py-2">From</th>
                                    <th className="py-2">To</th>
                                    <th className="py-2 text-right">Items</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transfers.map((t) => (
                                    <tr key={t.id}>
                                        <td className="py-3 text-gray-800">{t.number}</td>
                                        <td className="py-3 text-gray-600">{t.from_branch}</td>
                                        <td className="py-3 text-gray-600">{t.to_branch}</td>
                                        <td className="py-3 text-right text-gray-600">{t.items_count}</td>
                                        <td className="py-3">
                                            <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + statusColor(t.status)}>{t.status_label}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex justify-end gap-2 text-xs">
                                                {canApprove && t.can_approve && (
                                                    <button onClick={() => router.post(route('transfers.approve', t.id), {}, { preserveScroll: true })} className="text-green-600 hover:text-green-700">Approve</button>
                                                )}
                                                {canManage && t.can_dispatch && (
                                                    <button onClick={() => router.post(route('transfers.dispatch', t.id), {}, { preserveScroll: true })} className="text-indigo-600 hover:text-indigo-700">Dispatch</button>
                                                )}
                                                {canManage && t.can_receive && (
                                                    <button onClick={() => router.post(route('transfers.receive', t.id), {}, { preserveScroll: true })} className="text-indigo-600 hover:text-indigo-700">Receive</button>
                                                )}
                                                {canManage && t.can_cancel && (
                                                    <button onClick={() => router.post(route('transfers.cancel', t.id), {}, { preserveScroll: true })} className="text-red-600 hover:text-red-700">Cancel</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {transfers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">No transfers yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
