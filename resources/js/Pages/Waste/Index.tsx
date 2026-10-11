import { Badge, Button, Card, CardBody, CardHeader, EmptyState, KpiCard, PageHeader, SelectField, TextField } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface WasteRow {
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

const STATUS_TONE: Record<string, BadgeTone> = { approved: 'success', pending: 'warning', rejected: 'danger' };

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
    records: WasteRow[];
    approvalThreshold: number | null;
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
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
        form.transform((data) => ({ branch_id: data.branch_id, item_type, item_id: Number(item_id), quantity: data.quantity, reason: data.reason, notes: data.notes }));
        form.post(route('waste.store'), { preserveScroll: true, onSuccess: () => form.reset('quantity', 'notes') });
    };

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const pending = records.filter((r) => r.status === 'pending').length;

    return (
        <AuthenticatedLayout
            header={<PageHeader title="Waste & loss" description="Track spoilage and other losses, and approve anything above the threshold." />}
        >
            <Head title="Waste" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <KpiCard label="Total waste cost" value={totalCost.toFixed(2)} tone={totalCost > 0 ? 'warning' : 'neutral'} />
                        <KpiCard label="Records" value={records.length} />
                        <KpiCard label="Awaiting approval" value={pending} tone={pending > 0 ? 'warning' : 'neutral'} />
                        <KpiCard label="Approval threshold" value={approvalThreshold ?? 'Off'} />
                    </div>

                    {canCreate && (
                        <Card>
                            <CardHeader title="Record waste" />
                            <CardBody>
                                <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                                    <SelectField label="Branch" className="w-44" value={String(form.data.branch_id)} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} onChange={(v) => form.setData('branch_id', Number(v))} />
                                    <SelectField label="Item" className="w-56" value={form.data.item} options={items} onChange={(v) => form.setData('item', v)} />
                                    <TextField label="Quantity" type="number" className="w-28" value={String(form.data.quantity)} error={form.errors.quantity} onChange={(v) => form.setData('quantity', Number(v))} />
                                    <SelectField label="Reason" className="w-44" value={form.data.reason} options={reasons} onChange={(v) => form.setData('reason', v)} />
                                    <TextField label="Notes" className="w-56" value={form.data.notes} onChange={(v) => form.setData('notes', v)} />
                                    <Button type="submit" loading={form.processing}>Record waste</Button>
                                </form>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader title="Waste records" description={`${records.length} entries`} />
                        <CardBody className="p-0">
                            {records.length === 0 ? (
                                <EmptyState title="No waste recorded yet" description="Record spoilage or breakage to keep stock accurate." />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-5 py-3">Item</th>
                                                <th className="px-5 py-3">Branch</th>
                                                <th className="px-5 py-3 text-right">Qty</th>
                                                <th className="px-5 py-3 text-right">Cost</th>
                                                <th className="px-5 py-3">Reason</th>
                                                <th className="px-5 py-3">Status</th>
                                                <th className="px-5 py-3">By</th>
                                                {canApprove && <th className="px-5 py-3 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {records.map((r) => (
                                                <tr key={r.id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-3 font-medium text-gray-800">{r.item_name}</td>
                                                    <td className="px-5 py-3 text-gray-600">{r.branch ?? '—'}</td>
                                                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{r.quantity}</td>
                                                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{r.cost.toFixed(2)}</td>
                                                    <td className="px-5 py-3 text-gray-600">{r.reason_label}</td>
                                                    <td className="px-5 py-3">
                                                        <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-500">{r.recorded_by ?? '—'}</td>
                                                    {canApprove && (
                                                        <td className="px-5 py-3 text-right">
                                                            {r.status === 'pending' && (
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="xs" variant="success" onClick={() => router.post(route('waste.approve', r.id), {}, { preserveScroll: true })}>Approve</Button>
                                                                    <Button size="xs" variant="danger" onClick={() => router.post(route('waste.reject', r.id), {}, { preserveScroll: true })}>Reject</Button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
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
