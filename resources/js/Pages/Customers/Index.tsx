import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface CustomerRow {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    points: number;
    is_active: boolean;
}

export default function CustomersIndex({
    customers,
    loyaltyEnabled,
    filters,
}: {
    customers: CustomerRow[];
    loyaltyEnabled: boolean;
    filters: { search: string };
}) {
    const { auth, flash } = usePage().props;
    const canManage = auth.permissions.includes('customers.manage');

    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<CustomerRow | null>(null);

    const form = useForm({ name: '', phone: '', email: '', notes: '' });
    const pointsForm = useForm({ points: 0, reason: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('customers.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const adjustPoints = () => {
        if (!editing) return;
        pointsForm.post(route('customers.points', editing.id), {
            preserveScroll: true,
            onSuccess: () => {
                pointsForm.reset();
                setEditing(null);
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Customers</h2>}
        >
            <Head title="Customers" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>}

                    {canManage && (
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-3 text-base font-semibold text-gray-900">Add customer</h3>
                            <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="text-xs text-gray-500">Name</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Phone</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Email</label>
                                    <input className="block rounded-md border-gray-300 text-sm" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                </div>
                                <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                    Save
                                </button>
                                {Object.values(form.errors)[0] && <p className="text-sm text-red-600">{Object.values(form.errors)[0]}</p>}
                            </form>
                        </div>
                    )}

                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">
                                Customers {!loyaltyEnabled && <span className="text-xs font-normal text-gray-400">(loyalty disabled)</span>}
                            </h3>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    router.get(route('customers.index'), { search }, { preserveState: true, preserveScroll: true, replace: true });
                                }}
                                className="flex gap-2"
                            >
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="rounded-md border-gray-300 text-sm" />
                                <button type="submit" className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white">Search</button>
                            </form>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Phone</th>
                                    <th className="py-2 text-right">Points</th>
                                    {canManage && <th className="py-2 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {customers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="py-3 text-gray-800">{customer.name}</td>
                                        <td className="py-3 text-gray-600">{customer.phone}</td>
                                        <td className="py-3 text-right text-gray-700">{customer.points}</td>
                                        {canManage && (
                                            <td className="py-3 text-right">
                                                <button onClick={() => setEditing(customer)} className="text-xs text-indigo-600 hover:text-indigo-700">
                                                    Adjust points
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {customers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-500">No customers yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900">Adjust points — {editing.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">Current balance: {editing.points}</p>
                        <input
                            type="number"
                            className="mt-3 block w-full rounded-md border-gray-300"
                            value={pointsForm.data.points}
                            onChange={(e) => pointsForm.setData('points', Number(e.target.value))}
                            placeholder="Points (+/-)"
                        />
                        <input
                            className="mt-2 block w-full rounded-md border-gray-300"
                            value={pointsForm.data.reason}
                            onChange={(e) => pointsForm.setData('reason', e.target.value)}
                            placeholder="Reason"
                        />
                        {Object.values(pointsForm.errors)[0] && <p className="mt-2 text-sm text-red-600">{Object.values(pointsForm.errors)[0]}</p>}
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancel</button>
                            <button onClick={adjustPoints} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
