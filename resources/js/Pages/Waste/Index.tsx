import Modal from '@/Components/Modal';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    KpiCard,
    PageHeader,
    ConfirmDialog,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';

interface WasteRow {
    id: number;
    item_name: string;
    branch: string | null;
    quantity: number;
    cost: number;
    reason: string;
    reason_label: string;
    status: 'approved' | 'pending' | 'rejected' | string;
    notes: string | null;
    recorded_by: string | null;
    recorded_at?: string | null;
}

const STATUS_TONES: Record<string, BadgeTone> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
};

const REASON_COLORS: Record<string, string> = {
    spoilage: 'bg-amber-100 text-amber-800 border-amber-200',
    expired: 'bg-orange-100 text-orange-800 border-orange-200',
    breakage: 'bg-rose-100 text-rose-800 border-rose-200',
    prep_error: 'bg-blue-100 text-blue-800 border-blue-200',
    overcooked: 'bg-purple-100 text-purple-800 border-purple-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function WasteIndex({
    branches,
    items,
    reasons,
    records,
    approvalThreshold,
}: {
    branches: { id: number; name: string }[];
    items: { value: string; label: string; type: string; id: number; cost?: number }[];
    reasons: { value: string; label: string }[];
    records: WasteRow[];
    approvalThreshold: number | null;
}) {
    const { auth, flash } = usePage().props as Record<string, any>;
    const canCreate = auth.permissions.includes('waste.create');
    const canApprove = auth.permissions.includes('waste.approve');

    // UI state
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [reasonFilter, setReasonFilter] = useState<string>('all');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        open: boolean;
        title: string;
        message: string;
        tone: 'danger' | 'primary';
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', tone: 'primary', onConfirm: () => {} });

    // Waste creation form
    const form = useForm({
        branch_id: (branches[0]?.id ?? '') as number | '',
        item: items[0]?.value ?? '',
        quantity: 1,
        reason: reasons[0]?.value ?? 'spoilage',
        notes: '',
    });

    // Selected item unit cost estimation
    const selectedItem = useMemo(() => {
        return items.find((i) => i.value === form.data.item);
    }, [items, form.data.item]);

    const estimatedCost = useMemo(() => {
        if (!selectedItem || selectedItem.cost === undefined) return null;
        return Number((selectedItem.cost * Number(form.data.quantity)).toFixed(2));
    }, [selectedItem, form.data.quantity]);

    const willRequireApproval = useMemo(() => {
        if (approvalThreshold === null || estimatedCost === null) return false;
        return estimatedCost > approvalThreshold;
    }, [approvalThreshold, estimatedCost]);

    const submitWaste: FormEventHandler = (e) => {
        e.preventDefault();
        const [item_type, item_id] = form.data.item.split(':');
        form.transform((data) => ({
            branch_id: data.branch_id,
            item_type,
            item_id: Number(item_id),
            quantity: Number(data.quantity),
            reason: data.reason,
            notes: data.notes,
        }));
        form.post(route('waste.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCreateModalOpen(false);
                form.reset('quantity', 'notes');
            },
        });
    };

    // KPI Metrics
    const totalCost = useMemo(() => records.reduce((sum, r) => sum + r.cost, 0), [records]);
    const pendingCount = useMemo(() => records.filter((r) => r.status === 'pending').length, [records]);
    const approvedCount = useMemo(() => records.filter((r) => r.status === 'approved').length, [records]);
    const rejectedCount = useMemo(() => records.filter((r) => r.status === 'rejected').length, [records]);

    // Filtered records
    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchItem = r.item_name.toLowerCase().includes(q);
                const matchUser = r.recorded_by?.toLowerCase().includes(q);
                const matchNotes = r.notes?.toLowerCase().includes(q);
                const matchBranch = r.branch?.toLowerCase().includes(q);
                if (!matchItem && !matchUser && !matchNotes && !matchBranch) return false;
            }
            return true;
        });
    }, [records, statusFilter, reasonFilter, searchQuery]);

    const handleApprove = (record: WasteRow) => {
        setConfirmAction({
            open: true,
            title: `Approve Waste Incident #${record.id}?`,
            message: `Approving this incident will formally deduct ${record.quantity} units of ${record.item_name} from inventory balance (Valuation: $${record.cost.toFixed(2)}).`,
            tone: 'primary',
            onConfirm: () => {
                router.post(
                    route('waste.approve', record.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    const handleReject = (record: WasteRow) => {
        setConfirmAction({
            open: true,
            title: `Reject Waste Incident #${record.id}?`,
            message: `Rejecting this entry will discard the waste record. No inventory stock will be deducted.`,
            tone: 'danger',
            onConfirm: () => {
                router.post(
                    route('waste.reject', record.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Waste & Spoilage Tracking"
                    description="Monitor kitchen losses, track root cause reasons, and review manager approvals above threshold."
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {approvalThreshold !== null && (
                                <Badge tone="info">
                                    Approval Threshold: ${Number(approvalThreshold).toFixed(2)}
                                </Badge>
                            )}
                            {canCreate && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setCreateModalOpen(true)}
                                >
                                    + Record Waste Incident
                                </Button>
                            )}
                        </div>
                    }
                />
            }
        >
            <Head title="Waste & Loss Tracking" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Total Waste Cost"
                            value={`$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            tone={totalCost > 0 ? 'warning' : 'neutral'}
                            hint="Calculated loss across all approved and pending records"
                        />
                        <KpiCard
                            label="Total Incidents"
                            value={records.length}
                            hint={`${approvedCount} approved · ${rejectedCount} rejected`}
                        />
                        <KpiCard
                            label="Awaiting Approval"
                            value={pendingCount}
                            tone={pendingCount > 0 ? 'warning' : 'success'}
                            hint={pendingCount > 0 ? 'Requires manager review' : 'No pending approvals'}
                        />
                        <KpiCard
                            label="Approval Threshold"
                            value={approvalThreshold ? `$${Number(approvalThreshold).toFixed(2)}` : 'Auto-Approve'}
                            hint={
                                approvalThreshold
                                    ? 'Waste cost above threshold flags as pending'
                                    : 'All recorded waste auto-deducts'
                            }
                        />
                    </div>

                    {/* Filter Strip */}
                    <Card>
                        <CardHeader
                            title="Waste Incident Records"
                            description={`${filteredRecords.length} of ${records.length} total entries`}
                            action={
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search item, notes, recorder…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-9 w-48 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-60"
                                    />
                                    <select
                                        value={reasonFilter}
                                        onChange={(e) => setReasonFilter(e.target.value)}
                                        className="h-9 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="all">All Waste Reasons</option>
                                        {reasons.map((r) => (
                                            <option key={r.value} value={r.value}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            }
                        />

                        {/* Status Filter Chips */}
                        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-2.5 text-xs">
                            <span className="font-semibold text-gray-500">Filter Status:</span>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'all'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                All ({records.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('pending')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'pending'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                Pending Review ({pendingCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('approved')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'approved'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                                Approved ({approvedCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('rejected')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'rejected'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                                }`}
                            >
                                Rejected ({rejectedCount})
                            </button>
                        </div>

                        <CardBody className="p-0">
                            {filteredRecords.length === 0 ? (
                                <EmptyState
                                    title="No Waste Incidents Found"
                                    description={
                                        searchQuery || statusFilter !== 'all' || reasonFilter !== 'all'
                                            ? 'No records match your active search and filter criteria.'
                                            : 'No waste or spoilage incidents recorded. Keep up the clean inventory management!'
                                    }
                                    action={
                                        canCreate && (
                                            <Button
                                                size="sm"
                                                onClick={() => setCreateModalOpen(true)}
                                            >
                                                Record Incident
                                            </Button>
                                        )
                                    }
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <tr>
                                                <th className="px-6 py-3.5">Logged Date</th>
                                                <th className="px-6 py-3.5">Wasted Item</th>
                                                <th className="px-6 py-3.5">Branch</th>
                                                <th className="px-6 py-3.5 text-right">Quantity</th>
                                                <th className="px-6 py-3.5 text-right">Calculated Cost</th>
                                                <th className="px-6 py-3.5">Reason</th>
                                                <th className="px-6 py-3.5 text-center">Status</th>
                                                <th className="px-6 py-3.5">Logged By</th>
                                                {canApprove && (
                                                    <th className="px-6 py-3.5 text-right">Approval Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredRecords.map((r) => (
                                                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                                        {r.recorded_at
                                                            ? new Date(r.recorded_at).toLocaleString()
                                                            : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {r.item_name}
                                                        {r.notes && (
                                                            <span className="block text-xs font-normal text-gray-500 mt-0.5">
                                                                {r.notes}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {r.branch ?? '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-medium tabular-nums text-gray-900">
                                                        {r.quantity.toFixed(3)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold tabular-nums text-rose-700">
                                                        ${r.cost.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                                                REASON_COLORS[r.reason] ?? 'bg-gray-100 text-gray-800 border-gray-200'
                                                            }`}
                                                        >
                                                            {r.reason_label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <Badge tone={STATUS_TONES[r.status] ?? 'neutral'}>
                                                            {r.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-600">
                                                        {r.recorded_by ?? 'System'}
                                                    </td>
                                                    {canApprove && (
                                                        <td className="px-6 py-4 text-right">
                                                            {r.status === 'pending' ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="success"
                                                                        onClick={() => handleApprove(r)}
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="danger"
                                                                        onClick={() => handleReject(r)}
                                                                    >
                                                                        Reject
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">
                                                                    Resolved
                                                                </span>
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

            {/* MODAL: RECORD WASTE INCIDENT */}
            <Modal
                show={createModalOpen}
                maxWidth="lg"
                onClose={() => setCreateModalOpen(false)}
            >
                <form onSubmit={submitWaste} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Record Waste or Spoilage
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Log inventory loss to keep stock counts and cost of goods sold accurate.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="rounded-md p-1.5 text-gray-400 hover:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Branch Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Branch Location <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.data.branch_id}
                                    onChange={(e) => form.setData('branch_id', Number(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    required
                                >
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Reason Selection */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Waste Reason <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.data.reason}
                                    onChange={(e) => form.setData('reason', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    required
                                >
                                    {reasons.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Item Selection */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Item Wasted <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.data.item}
                                onChange={(e) => form.setData('item', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                            >
                                {items.map((i) => (
                                    <option key={i.value} value={i.value}>
                                        {i.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Wasted Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={form.data.quantity}
                                onChange={(e) => form.setData('quantity', Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                            />
                            {form.errors.quantity && (
                                <p className="mt-1 text-xs text-rose-600">{form.errors.quantity}</p>
                            )}
                        </div>

                        {/* Live Cost Estimation & Threshold Notice */}
                        {estimatedCost !== null && (
                            <div
                                className={`rounded-lg border p-3.5 text-xs ${
                                    willRequireApproval
                                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                                        : 'border-gray-200 bg-gray-50 text-gray-800'
                                }`}
                            >
                                <div className="flex items-center justify-between font-semibold">
                                    <span>Estimated Loss Valuation:</span>
                                    <span className="font-mono text-sm">${estimatedCost.toFixed(2)}</span>
                                </div>
                                {willRequireApproval && (
                                    <p className="mt-1.5 text-xs text-amber-800">
                                        ⚠️ This loss exceeds the manager threshold ($
                                        {Number(approvalThreshold).toFixed(2)}). It will be submitted as{' '}
                                        <span className="font-bold underline">Pending Approval</span> and will not deduct
                                        stock until reviewed.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Root Cause Notes / Observations
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Explain how or why this spoilage occurred (e.g. Fridge unit 2 temp spiked overnight)"
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCreateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={form.processing}
                        >
                            Submit Waste Record
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ACTION CONFIRMATION MODAL */}
            <ConfirmDialog
                show={confirmAction.open}
                title={confirmAction.title}
                description={confirmAction.message}
                tone={confirmAction.tone}
                confirmLabel="Confirm"
                onConfirm={confirmAction.onConfirm}
                onClose={() => setConfirmAction((prev) => ({ ...prev, open: false }))}
            />
        </AuthenticatedLayout>
    );
}
