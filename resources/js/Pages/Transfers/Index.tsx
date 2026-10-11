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

interface TransferRow {
    id: number;
    number: string;
    from_branch: string | null;
    to_branch: string | null;
    status: 'draft' | 'approved' | 'dispatched' | 'received' | 'cancelled' | string;
    status_label: string;
    items_count: number;
    notes: string | null;
    created_at?: string | null;
    can_approve: boolean;
    can_dispatch: boolean;
    can_receive: boolean;
    can_cancel: boolean;
}

const STATUS_TONE: Record<string, BadgeTone> = {
    received: 'success',
    dispatched: 'info',
    cancelled: 'danger',
    draft: 'neutral',
    approved: 'info',
};

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

    // UI state
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'dispatched' | 'received'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        open: boolean;
        title: string;
        message: string;
        tone: 'danger' | 'primary';
        confirmLabel: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', tone: 'primary', confirmLabel: 'Confirm', onConfirm: () => {} });

    // Multi-line transfer form
    const form = useForm({
        from_branch_id: (branches[0]?.id ?? '') as number | '',
        to_branch_id: (branches[1]?.id ?? branches[0]?.id ?? '') as number | '',
        notes: '',
        lines: [
            { item: items[0]?.value ?? '', quantity: 1 },
        ] as { item: string; quantity: number }[],
    });

    const sameBranchError = form.data.from_branch_id === form.data.to_branch_id;

    // Add another item line to transfer
    const addLine = () => {
        form.setData('lines', [
            ...form.data.lines,
            { item: items[0]?.value ?? '', quantity: 1 },
        ]);
    };

    const removeLine = (index: number) => {
        if (form.data.lines.length <= 1) return;
        form.setData(
            'lines',
            form.data.lines.filter((_, idx) => idx !== index)
        );
    };

    const updateLineItem = (index: number, itemValue: string) => {
        const next = [...form.data.lines];
        next[index] = { ...next[index], item: itemValue };
        form.setData('lines', next);
    };

    const updateLineQty = (index: number, qty: number) => {
        const next = [...form.data.lines];
        next[index] = { ...next[index], quantity: qty };
        form.setData('lines', next);
    };

    const submitTransfer: FormEventHandler = (e) => {
        e.preventDefault();
        if (sameBranchError) return;

        const formattedItems = form.data.lines
            .filter((l) => l.item && l.quantity > 0)
            .map((l) => {
                const [item_type, item_id] = l.item.split(':');
                return {
                    item_type,
                    item_id: Number(item_id),
                    quantity: Number(l.quantity),
                };
            });

        form.transform((data) => ({
            from_branch_id: data.from_branch_id,
            to_branch_id: data.to_branch_id,
            notes: data.notes,
            items: formattedItems,
        }));

        form.post(route('transfers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCreateModalOpen(false);
                form.reset();
            },
        });
    };

    // KPI Metrics
    const inTransitCount = useMemo(
        () => transfers.filter((t) => t.status === 'dispatched').length,
        [transfers]
    );
    const draftCount = useMemo(
        () => transfers.filter((t) => t.status === 'draft').length,
        [transfers]
    );
    const receivedCount = useMemo(
        () => transfers.filter((t) => t.status === 'received').length,
        [transfers]
    );

    // Filtered transfers
    const filteredTransfers = useMemo(() => {
        return transfers.filter((t) => {
            if (statusFilter !== 'all' && t.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchNum = t.number.toLowerCase().includes(q);
                const matchFrom = t.from_branch?.toLowerCase().includes(q);
                const matchTo = t.to_branch?.toLowerCase().includes(q);
                const matchNotes = t.notes?.toLowerCase().includes(q);
                if (!matchNum && !matchFrom && !matchTo && !matchNotes) return false;
            }
            return true;
        });
    }, [transfers, statusFilter, searchQuery]);

    // Lifecycle Actions
    const handleApprove = (transfer: TransferRow) => {
        setConfirmAction({
            open: true,
            title: `Approve Transfer ${transfer.number}?`,
            message: `Approving this transfer authorizes the origin branch (${transfer.from_branch}) to pack and dispatch stock.`,
            tone: 'primary',
            confirmLabel: 'Approve Transfer',
            onConfirm: () => {
                router.post(
                    route('transfers.approve', transfer.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    const handleDispatch = (transfer: TransferRow) => {
        setConfirmAction({
            open: true,
            title: `Dispatch Transfer ${transfer.number}?`,
            message: `Dispatching will formally deduct the transferred items from "${transfer.from_branch}" stock ledger and mark the shipment in transit.`,
            tone: 'primary',
            confirmLabel: 'Confirm Dispatch',
            onConfirm: () => {
                router.post(
                    route('transfers.dispatch', transfer.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    const handleReceive = (transfer: TransferRow) => {
        setConfirmAction({
            open: true,
            title: `Receive Transfer ${transfer.number}?`,
            message: `Receiving will credit all shipped items directly into "${transfer.to_branch}" stock on hand and complete the transfer workflow.`,
            tone: 'primary',
            confirmLabel: 'Confirm Goods Received',
            onConfirm: () => {
                router.post(
                    route('transfers.receive', transfer.id),
                    {},
                    {
                        preserveScroll: true,
                        onSuccess: () => setConfirmAction((prev) => ({ ...prev, open: false })),
                    }
                );
            },
        });
    };

    const handleCancel = (transfer: TransferRow) => {
        setConfirmAction({
            open: true,
            title: `Cancel Transfer ${transfer.number}?`,
            message: `Are you sure you want to cancel this transfer? This action cannot be reversed once finalized.`,
            tone: 'danger',
            confirmLabel: 'Cancel Transfer',
            onConfirm: () => {
                router.post(
                    route('transfers.cancel', transfer.id),
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
                    title="Stock Transfers"
                    description="Move inventory safely between kitchen branches with full dispatch and receipt reconciliation."
                    actions={
                        canManage && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setCreateModalOpen(true)}
                            >
                                + New Stock Transfer
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Stock Transfers" />

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

                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <KpiCard
                            label="Total Transfers"
                            value={transfers.length}
                            hint="All recorded inter-branch shipments"
                        />
                        <KpiCard
                            label="In Transit (Dispatched)"
                            value={inTransitCount}
                            tone={inTransitCount > 0 ? 'warning' : 'neutral'}
                            hint={inTransitCount > 0 ? 'Pending destination receipt' : 'No shipments currently in transit'}
                        />
                        <KpiCard
                            label="Drafts / Pending Approval"
                            value={draftCount}
                            tone={draftCount > 0 ? 'warning' : 'neutral'}
                            hint={draftCount > 0 ? 'Requires manager sign-off' : 'All created transfers approved'}
                        />
                        <KpiCard
                            label="Completed Transfers"
                            value={receivedCount}
                            tone="success"
                            hint="Successfully received at destination"
                        />
                    </div>

                    {/* Workflow Explanation Banner */}
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-indigo-950">
                                📦 Inter-Branch Transfer Lifecycle:
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 font-medium">
                                <span className="rounded bg-white px-2 py-0.5 shadow-xs border border-indigo-200 text-indigo-800">
                                    1. Draft
                                </span>
                                <span>➔</span>
                                <span className="rounded bg-white px-2 py-0.5 shadow-xs border border-indigo-200 text-indigo-800">
                                    2. Approved
                                </span>
                                <span>➔</span>
                                <span className="rounded bg-white px-2 py-0.5 shadow-xs border border-indigo-200 text-indigo-800">
                                    3. Dispatched (Deducted from Origin)
                                </span>
                                <span>➔</span>
                                <span className="rounded bg-white px-2 py-0.5 shadow-xs border border-indigo-200 text-emerald-800">
                                    4. Received (Credited to Destination)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Transfers Table */}
                    <Card>
                        <CardHeader
                            title="Branch Shipments"
                            description={`${filteredTransfers.length} of ${transfers.length} total transfers`}
                            action={
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search transfer # or branch…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-9 w-48 rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-60"
                                    />
                                </div>
                            }
                        />

                        {/* Status Filter Chips */}
                        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-2.5 text-xs">
                            <span className="font-semibold text-gray-500">Filter:</span>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'all'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                All ({transfers.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('draft')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'draft'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                Drafts ({draftCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('dispatched')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'dispatched'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                                }`}
                            >
                                In Transit ({inTransitCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('received')}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${
                                    statusFilter === 'received'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                                Received ({receivedCount})
                            </button>
                        </div>

                        <CardBody className="p-0">
                            {filteredTransfers.length === 0 ? (
                                <EmptyState
                                    title="No Stock Transfers Found"
                                    description={
                                        searchQuery || statusFilter !== 'all'
                                            ? 'No transfers match your current filter criteria.'
                                            : 'No branch transfers have been created yet.'
                                    }
                                    action={
                                        canManage && (
                                            <Button
                                                size="sm"
                                                onClick={() => setCreateModalOpen(true)}
                                            >
                                                Create First Transfer
                                            </Button>
                                        )
                                    }
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            <tr>
                                                <th className="px-6 py-3.5">Transfer #</th>
                                                <th className="px-6 py-3.5">Route (From ➔ To)</th>
                                                <th className="px-6 py-3.5 text-right">Items Shipped</th>
                                                <th className="px-6 py-3.5 text-center">Transfer Status</th>
                                                <th className="px-6 py-3.5">Dispatch Notes</th>
                                                <th className="px-6 py-3.5 text-right">Lifecycle Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {filteredTransfers.map((t) => (
                                                <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                                                        {t.number}
                                                        {t.created_at && (
                                                            <span className="block font-sans text-xs font-normal text-gray-400 mt-0.5">
                                                                {new Date(t.created_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
                                                                {t.from_branch ?? 'Origin'}
                                                            </span>
                                                            <span className="text-gray-400 font-bold">➔</span>
                                                            <span className="font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                                                                {t.to_branch ?? 'Destination'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-medium tabular-nums text-gray-900">
                                                        {t.items_count} {t.items_count === 1 ? 'line item' : 'line items'}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>
                                                            {t.status_label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                                        {t.notes ?? '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {canApprove && t.can_approve && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="success"
                                                                    onClick={() => handleApprove(t)}
                                                                >
                                                                    Approve
                                                                </Button>
                                                            )}
                                                            {canManage && t.can_dispatch && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="primary"
                                                                    onClick={() => handleDispatch(t)}
                                                                >
                                                                    Dispatch Stock
                                                                </Button>
                                                            )}
                                                            {canManage && t.can_receive && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="success"
                                                                    onClick={() => handleReceive(t)}
                                                                >
                                                                    Receive Stock
                                                                </Button>
                                                            )}
                                                            {canManage && t.can_cancel && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="secondary"
                                                                    className="text-rose-600 hover:text-rose-700"
                                                                    onClick={() => handleCancel(t)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            )}
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

            {/* MODAL: CREATE NEW TRANSFER */}
            <Modal
                show={createModalOpen}
                maxWidth="lg"
                onClose={() => setCreateModalOpen(false)}
            >
                <form onSubmit={submitTransfer} className="p-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Create New Stock Transfer
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Specify origin and destination branches and items to be transferred.
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
                        {/* Origin & Destination */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Origin Branch (From) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.data.from_branch_id}
                                    onChange={(e) => form.setData('from_branch_id', Number(e.target.value))}
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

                            <div>
                                <label className="block text-xs font-medium text-gray-700">
                                    Destination Branch (To) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.data.to_branch_id}
                                    onChange={(e) => form.setData('to_branch_id', Number(e.target.value))}
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
                        </div>

                        {sameBranchError && (
                            <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                                ⚠️ Origin branch and destination branch must be different.
                            </div>
                        )}

                        {/* Line Items */}
                        <div>
                            <div className="flex items-center justify-between pb-1.5">
                                <label className="block text-xs font-semibold text-gray-800">
                                    Items to Transfer
                                </label>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                    + Add Another Item
                                </button>
                            </div>

                            <div className="space-y-2">
                                {form.data.lines.map((line, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50/50 p-2"
                                    >
                                        <div className="flex-1">
                                            <select
                                                value={line.item}
                                                onChange={(e) => updateLineItem(idx, e.target.value)}
                                                className="block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                required
                                            >
                                                {items.map((i) => (
                                                    <option key={i.value} value={i.value}>
                                                        {i.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-28">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0.001"
                                                placeholder="Qty"
                                                value={line.quantity}
                                                onChange={(e) => updateLineQty(idx, Number(e.target.value))}
                                                className="block w-full rounded-md border-gray-300 font-mono text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>

                                        {form.data.lines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeLine(idx)}
                                                className="rounded p-1 text-gray-400 hover:text-rose-600"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dispatch Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700">
                                Shipment Notes / Packing Instructions
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g. Frozen goods, transport with cold box"
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
                            disabled={sameBranchError}
                            loading={form.processing}
                        >
                            Create Transfer
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM ACTION DIALOG */}
            <ConfirmDialog
                show={confirmAction.open}
                title={confirmAction.title}
                description={confirmAction.message}
                tone={confirmAction.tone}
                confirmLabel={confirmAction.confirmLabel}
                onConfirm={confirmAction.onConfirm}
                onClose={() => setConfirmAction((prev) => ({ ...prev, open: false }))}
            />
        </AuthenticatedLayout>
    );
}
