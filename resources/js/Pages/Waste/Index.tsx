import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface Record {
    id: number;
    item_name: string;
    branch: string | null;
    quantity: number;
    cost: number;
    reason_label: string;
    status: string;
    notes: string | null;
    recorded_by: string | null;
}

export default function WasteIndex({
    branches,
    items,
    reasons,
    records,
    approvalThreshold,
}: {
    branches: { id: number; name: string }[];
    items: { value: string; label: string; type: string; id: number }[];
    reasons: { value: string; label: string }[];
    records: Record[];
    approvalThreshold: number | null;
}) {
    const { auth, flash } = usePage().props;
    const canCreate = auth.permissions.includes('waste.create');
    const canApprove = auth.permissions.includes('waste.approve');

    const form = useForm({
        branch_id: branches[0]?.id ?? ('' as number | ''),
        item: items[0]?.value ?? '',
        quantity: 1,
        reason: reasons[0]?.value ?? 'spoilage',
        notes: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const [item_type, item_id] = form.data.item.split(':');
        form.transform((data) => ({
            branch_id: data.branch_id,
            item_type,
            item_id: Number(item_id),
            quantity: data.quantity,
            reason: data.reason,
            notes: data.notes,
        }));
        form.post(route('waste.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('quantity', 'notes'),
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Waste &amp; loss</h2>}
        >
            <Head title="Waste" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}

                    {approvalThreshold !== null && (
                        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            Waste above {approvalThreshold} requires approval before it affects stock.
                        </div>
                    )}

                    {canCreate && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Record waste</h3>
                            <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Branch</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={form.data.branch_id} onChange={(e) => form.setData('branch_id', Number(e.target.value))}>
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
                                <div>
                                    <label className="text-xs text-gray-500">Reason</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)}>
                                        {reasons.map((r) => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Notes</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                                </div>
                                <button type="submit" disabled={form.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                    Record waste
                                </button>
                                {Object.values(form.errors)[0] && <p className="text-sm text-red-600">{Object.values(form.errors)[0]}</p>}
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">Waste records</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Item</th>
                                    <th className="py-2">Branch</th>
                                    <th className="py-2 text-right">Qty</th>
                                    <th className="py-2 text-right">Cost</th>
                                    <th className="py-2">Reason</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">By</th>
                                    {canApprove && <th className="py-2 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map((r) => (
                                    <tr key={r.id}>
                                        <td className="py-3 text-gray-800">{r.item_name}</td>
                                        <td className="py-3 text-gray-600">{r.branch}</td>
                                        <td className="py-3 text-right text-gray-600">{r.quantity}</td>
                                        <td className="py-3 text-right text-gray-600">{r.cost.toFixed(2)}</td>
                                        <td className="py-3 text-gray-600">{r.reason_label}</td>
                                        <td className="py-3">
                                            <span
                                                className={
                                                    'rounded-full px-2 py-0.5 text-xs font-medium ' +
                                                    (r.status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : r.status === 'pending'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : 'bg-gray-200 text-gray-600')
                                                }
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500">{r.recorded_by}</td>
                                        {canApprove && (
                                            <td className="py-3 text-right">
                                                {r.status === 'pending' && (
                                                    <div className="flex justify-end gap-2 text-xs">
                                                        <button onClick={() => router.post(route('waste.approve', r.id), {}, { preserveScroll: true })} className="text-green-600 hover:text-green-700">Approve</button>
                                                        <button onClick={() => router.post(route('waste.reject', r.id), {}, { preserveScroll: true })} className="text-red-600 hover:text-red-700">Reject</button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {records.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-500">No waste recorded yet.</td>
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
