import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface ZoneRow {
    id: number;
    name: string;
    branch: string | null;
    fee: number;
    min_order: number;
    is_active: boolean;
}

export default function DeliveryIndex({
    branches,
    zones,
}: {
    branches: { id: number; name: string }[];
    zones: ZoneRow[];
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('settings.manage');

    const form = useForm({
        branch_id: '' as number | '',
        name: '',
        fee: 0,
        min_order: 0,
        is_active: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('delivery-zones.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('name', 'fee', 'min_order'),
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Delivery zones</h2>}
        >
            <Head title="Delivery zones" />

            <div className="py-8">
                <div className="mx-auto max-w-5xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}

                    {canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">New zone</h3>
                            <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Name</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Branch</label>
                                    <select className="block rounded-md border-gray-300 text-sm" value={form.data.branch_id} onChange={(e) => form.setData('branch_id', e.target.value ? Number(e.target.value) : '')}>
                                        <option value="">All branches</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Fee</label>
                                    <input type="number" step="0.01" className="block w-28 rounded-md border-gray-300 text-sm" value={form.data.fee} onChange={(e) => form.setData('fee', Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Min order</label>
                                    <input type="number" step="0.01" className="block w-28 rounded-md border-gray-300 text-sm" value={form.data.min_order} onChange={(e) => form.setData('min_order', Number(e.target.value))} />
                                </div>
                                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Create</button>
                                {Object.values(form.errors)[0] && <p className="text-sm text-red-600">{Object.values(form.errors)[0]}</p>}
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Zone</th>
                                    <th className="py-2">Branch</th>
                                    <th className="py-2 text-right">Fee</th>
                                    <th className="py-2 text-right">Min order</th>
                                    <th className="py-2">Status</th>
                                    {canManage && <th className="py-2 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {zones.map((zone) => (
                                    <tr key={zone.id}>
                                        <td className="py-3 text-gray-800">{zone.name}</td>
                                        <td className="py-3 text-gray-600">{zone.branch ?? 'All'}</td>
                                        <td className="py-3 text-right text-gray-700">{zone.fee.toFixed(2)}</td>
                                        <td className="py-3 text-right text-gray-700">{zone.min_order.toFixed(2)}</td>
                                        <td className="py-3 text-gray-600">{zone.is_active ? 'Active' : 'Inactive'}</td>
                                        {canManage && (
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => router.delete(route('delivery-zones.destroy', zone.id), { preserveScroll: true })}
                                                    className="text-xs text-red-600 hover:text-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {zones.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">No delivery zones yet.</td>
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
