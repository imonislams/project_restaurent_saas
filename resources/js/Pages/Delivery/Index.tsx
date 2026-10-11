import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, SelectField, TextField } from '@/Components/ui';
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

export default function DeliveryIndex({ branches, zones }: { branches: { id: number; name: string }[]; zones: ZoneRow[] }) {
    const { auth, flash } = usePage().props as Record<string, any>;
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
        form.post(route('delivery-zones.store'), { preserveScroll: true, onSuccess: () => form.reset('name', 'fee', 'min_order') });
    };

    return (
        <AuthenticatedLayout header={<PageHeader title="Delivery zones" description="Define your delivery areas, fees and minimum order values." />}>
            <Head title="Delivery zones" />

            <div className="py-6">
                <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    {canManage && (
                        <Card>
                            <CardHeader title="New zone" />
                            <CardBody>
                                <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                    <TextField label="Name" className="w-56" value={form.data.name} error={form.errors.name} onChange={(v) => form.setData('name', v)} />
                                    <SelectField
                                        label="Branch"
                                        className="w-44"
                                        value={form.data.branch_id === '' ? '' : String(form.data.branch_id)}
                                        options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                                        onChange={(v) => form.setData('branch_id', v ? Number(v) : '')}
                                    />
                                    <TextField label="Fee" type="number" className="w-28" value={String(form.data.fee)} error={form.errors.fee} onChange={(v) => form.setData('fee', Number(v))} />
                                    <TextField label="Min order" type="number" className="w-32" value={String(form.data.min_order)} error={form.errors.min_order} onChange={(v) => form.setData('min_order', Number(v))} />
                                    <Button type="submit" loading={form.processing}>Create</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader title="Zones" description={`${zones.length} total`} />
                        <CardBody className="p-0">
                            {zones.length === 0 ? (
                                <EmptyState title="No delivery zones yet" description="Add a zone to start accepting delivery orders." />
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">Zone</th>
                                            <th className="px-5 py-3">Branch</th>
                                            <th className="px-5 py-3 text-right">Fee</th>
                                            <th className="px-5 py-3 text-right">Min order</th>
                                            <th className="px-5 py-3">Status</th>
                                            {canManage && <th className="px-5 py-3 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {zones.map((zone) => (
                                            <tr key={zone.id} className="hover:bg-gray-50">
                                                <td className="px-5 py-3 font-medium text-gray-800">{zone.name}</td>
                                                <td className="px-5 py-3 text-gray-600">{zone.branch ?? 'All'}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-gray-700">{zone.fee.toFixed(2)}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-gray-700">{zone.min_order.toFixed(2)}</td>
                                                <td className="px-5 py-3">
                                                    <Badge tone={zone.is_active ? 'success' : 'neutral'}>{zone.is_active ? 'Active' : 'Inactive'}</Badge>
                                                </td>
                                                {canManage && (
                                                    <td className="px-5 py-3 text-right">
                                                        <Button size="xs" variant="ghost" onClick={() => router.delete(route('delivery-zones.destroy', zone.id), { preserveScroll: true })}>
                                                            Delete
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
        </AuthenticatedLayout>
    );
}
