import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
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

const STATUS_TONE: Record<string, BadgeTone> = { received: 'success', dispatched: 'info', cancelled: 'danger', draft: 'neutral', approved: 'info' };

export default function TransfersIndex({
    branches,
    items,
    transfers,
}: {
    branches: { id: number; name: string }[];
    items: { value: string; label: string; type: string; id: number; cost: number }[];
    transfers: TransferRow[];
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
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
        form.post(route('transfers.store'), { preserveScroll: true, onSuccess: () => form.reset('quantity', 'notes') });
    };

    return (
        <AuthenticatedLayout
            header={<PageHeader title="Stock transfers" description="Move stock between branches and track each transfer to receipt." />}
        >
            <Head title="Transfers" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    {canManage && (
                        <Card>
                            <CardHeader title="New transfer" />
                            <CardBody>
                                <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                    <SelectField label="From" className="w-44" value={String(form.data.from_branch_id)} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} onChange={(v) => form.setData('from_branch_id', Number(v))} />
                                    <SelectField label="To" className="w-44" value={String(form.data.to_branch_id)} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} onChange={(v) => form.setData('to_branch_id', Number(v))} />
                                    <SelectField label="Item" className="w-56" value={form.data.item} options={items} onChange={(v) => form.setData('item', v)} />
                                    <TextField label="Quantity" type="number" className="w-28" value={String(form.data.quantity)} error={form.errors.quantity} onChange={(v) => form.setData('quantity', Number(v))} />
                                    <Button type="submit" loading={form.processing}>Create transfer</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader title="Transfers" description={`${transfers.length} total`} />
                        <CardBody className="p-0">
                            {transfers.length === 0 ? (
                                <EmptyState title="No transfers yet" description="Create a transfer to move stock between branches." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-5 py-3">Number</th>
                                                <th className="px-5 py-3">From → To</th>
                                                <th className="px-5 py-3 text-right">Items</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {transfers.map((t) => (
                                                <tr key={t.id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-3 font-medium text-gray-800">{t.number}</td>
                                                    <td className="px-5 py-3 text-gray-600">
                                                        {t.from_branch} → {t.to_branch}
                                                    </td>
                                                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{t.items_count}</td>
                                                    <td className="px-5 py-3">
                                                        <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status_label}</Badge>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {canApprove && t.can_approve && <Button size="xs" variant="success" onClick={() => router.post(route('transfers.approve', t.id), {}, { preserveScroll: true })}>Approve</Button>}
                                                            {canManage && t.can_dispatch && <Button size="xs" variant="primary" onClick={() => router.post(route('transfers.dispatch', t.id), {}, { preserveScroll: true })}>Dispatch</Button>}
                                                            {canManage && t.can_receive && <Button size="xs" variant="primary" onClick={() => router.post(route('transfers.receive', t.id), {}, { preserveScroll: true })}>Receive</Button>}
                                                            {canManage && t.can_cancel && <Button size="xs" variant="danger" onClick={() => router.post(route('transfers.cancel', t.id), {}, { preserveScroll: true })}>Cancel</Button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
