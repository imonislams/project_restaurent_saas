import { Badge, Button, Card, CardBody, CardHeader, Drawer, EmptyState, PageHeader, TextField } from '@/Components/ui';
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
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth.permissions.includes('customers.manage');

    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<CustomerRow | null>(null);

    const form = useForm({ name: '', phone: '', email: '', notes: '' });
    const pointsForm = useForm({ points: 0, reason: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('customers.store'), { preserveScroll: true, onSuccess: () => form.reset() });
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
            header={
                <PageHeader
                    title="Customers"
                    description="Your customer book, contact details and loyalty points."
                    actions={!loyaltyEnabled ? <Badge tone="neutral">Loyalty disabled</Badge> : undefined}
                />
            }
        >
            <Head title="Customers" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    {canManage && (
                        <Card>
                            <CardHeader title="Add customer" />
                            <CardBody>
                                <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                    <TextField label="Name" className="w-56" value={form.data.name} error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                                    <TextField label="Phone" className="w-44" value={form.data.phone} error={form.errors.phone} onChange={(v) => form.setData('phone', v)} />
                                    <TextField label="Email" type="email" className="w-56" value={form.data.email} error={form.errors.email} onChange={(v) => form.setData('email', v)} />
                                    <Button type="submit" loading={form.processing}>Save</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader
                            title={`Customers${!loyaltyEnabled ? ' · loyalty disabled' : ''}`}
                            description={`${customers.length} shown`}
                            action={<TextField placeholder="Search" value={search} onChange={setSearch} onEnter={() => router.get(route('customers.index'), { search }, { preserveState: true, preserveScroll: true, replace: true })} />}
                        />
                        <CardBody className="p-0">
                            {customers.length === 0 ? (
                                <EmptyState title="No customers yet" description="Add your first customer to start tracking loyalty." />
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">Name</th>
                                            <th className="px-5 py-3">Contact</th>
                                            <th className="px-5 py-3 text-right">Points</th>
                                            {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {customers.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-gray-50">
                                                <td className="px-5 py-3 font-medium text-gray-800">{customer.name}</td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {customer.phone ?? '—'}
                                                    {customer.email ? <span className="block text-xs text-gray-400">{customer.email}</span> : null}
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-gray-700">{customer.points}</td>
                                                {canManage && (
                                                    <td className="px-5 py-3 text-right">
                                                        <Button size="xs" variant="ghost" onClick={() => setEditing(customer)} disabled={!loyaltyEnabled}>
                                                            Adjust points
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            <Drawer
                show={editing !== null}
                onClose={() => setEditing(null)}
                title={`Adjust points — ${editing?.name ?? ''}`}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button loading={pointsForm.processing} onClick={adjustPoints}>Apply</Button>
                    </div>
                }
            >
                <p className="mb-4 text-sm text-gray-500">Current balance: <span className="font-medium text-gray-800">{editing?.points ?? 0}</span></p>
                <div className="space-y-4">
                    <TextField label="Points (+/-)" type="number" value={String(pointsForm.data.points)} error={pointsForm.errors.points} onChange={(v) => pointsForm.setData('points', Number(v))} />
                    <TextField label="Reason" value={pointsForm.data.reason} error={pointsForm.errors.reason} onChange={(v) => pointsForm.setData('reason', v)} />
                </div>
            </Drawer>
        </AuthenticatedLayout>
    );
}
